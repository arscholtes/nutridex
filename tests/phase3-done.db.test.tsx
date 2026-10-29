// Phase 3's "Done when", against a database `npm run seed` has filled: you can browse from carrot →
// beta-carotene → skin color → pumpkin, and a flag that rests on a compound's class rather than a
// measurement looks visibly different from a measured one wherever it appears.
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, test } from "vitest";
import { CompoundEntryView } from "../components/compound-entry.tsx";
import { EffectEntryView } from "../components/effect-entry.tsx";
import { IngredientEntryView } from "../components/ingredient-entry.tsx";
import { sql } from "../lib/db/client.ts";
import { compoundEntry, effectEntry, ingredientEntry } from "../lib/db/dex.ts";
import { inRolledBackTransaction } from "./helpers/db.ts";

afterAll(() => sql.end());

const links = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

/** @return [T] the entry, failing the test when the slug finds none */
function found<T>(entry: T | null): T {
  expect(entry).not.toBeNull();
  return entry!;
}

describe("browsing carrot → beta-carotene → skin color → pumpkin", () => {
  test("the carrot entry links to beta-carotene", async () => {
    const html = renderToStaticMarkup(<IngredientEntryView entry={found(await ingredientEntry("carrot"))} />);
    expect(links(html)).toContain("/compounds/beta-carotene");
  });

  test("every compound the carrot carries links to its own entry, not only those with a flag", async () => {
    const entry = found(await ingredientEntry("carrot"));
    const html = renderToStaticMarkup(<IngredientEntryView entry={entry} />);
    expect(entry.compounds.map((c) => c.slug)).toContain("vitamin-k1");
    expect(links(html)).toEqual(expect.arrayContaining(entry.compounds.map((c) => `/compounds/${c.slug}`)));
  });

  test("the beta-carotene entry links to skin color", async () => {
    const html = renderToStaticMarkup(<CompoundEntryView entry={found(await compoundEntry("beta-carotene"))} />);
    expect(links(html)).toContain("/effects/skin-color");
  });

  test("the skin color page links to pumpkin", async () => {
    const html = renderToStaticMarkup(<EffectEntryView entry={found(await effectEntry("skin-color"))} />);
    expect(links(html)).toContain("/ingredients/canned-pumpkin-puree");
  });

  test("the pumpkin entry shows its beta-carotene, and links back to it", async () => {
    const entry = found(await ingredientEntry("canned-pumpkin-puree"));
    expect(entry.compounds.find((c) => c.slug === "beta-carotene")).toMatchObject({ amount: 6940, unit: "µg" });
    const html = renderToStaticMarkup(<IngredientEntryView entry={entry} />);
    expect(html).toContain("Canned pumpkin purée");
    expect(links(html)).toContain("/compounds/beta-carotene");
  });
});

describe("the fact behind the skin color step", () => {
  test("the carrot entry shows the dose the trial used beside the effect, since no food group in it reached that", async () => {
    const html = renderToStaticMarkup(<IngredientEntryView entry={found(await ingredientEntry("carrot"))} />);
    expect(html).toContain("30 mg of purified beta-carotene a day; 12 mg a day and every food group fell short within 42 days");
  });

  test("beta-carotene → skin color cites its trial with grade B, its dose and its onset", async () => {
    const entry = found(await effectEntry("skin-color"));
    expect(entry.compounds).toEqual([
      expect.objectContaining({
        compound: expect.objectContaining({ slug: "beta-carotene" }),
        grade: "B",
        onset: "25 to 42 days",
        source: expect.objectContaining({ title: expect.stringMatching(/^Carotenodermia in men/) }),
      }),
    ]);
  });
});

describe("a flag resting on a class looks different from a measured one wherever it appears", () => {
  // Every seeded rule is measured today, so a fixture compound joins ChEBI's carotene class, with an
  // amount in carrot, inside a transaction that is always rolled back.
  const FIXTURE = "fixture-unmeasured-carotene";

  async function withByClassFixture(body: (tx: typeof sql) => Promise<void>) {
    await inRolledBackTransaction(async (tx) => {
      const [k] = await tx`select id, source_id from compound_class where chebi_id = 23042`;
      const [c] = await tx`insert into compound (slug, name, class) values (${FIXTURE}, 'Fixture carotene', 'carotenoid') returning id`;
      await tx`insert into compound_class_member (class_id, compound_id, source_id) values (${k.id}, ${c.id}, ${k.source_id})`;
      await tx`
        insert into ingredient_compound (ingredient_id, compound_id, amount_per_100g, unit)
        select id, ${c.id}, 100, 'µg' from ingredient where slug = 'carrot'`;
      await body(tx);
    });
  }

  test("on the compound's own entry", async () => {
    await withByClassFixture(async (tx) => {
      const entry = found(await compoundEntry(FIXTURE, tx));
      expect(entry.modifiers.map((m) => m.basis)).toEqual(["by-class"]);
      const html = renderToStaticMarkup(<CompoundEntryView entry={entry} />);
      expect(html).toContain('data-basis="by-class"');
      expect(html).toContain("By class: carotene");
      expect(html).not.toContain('data-basis="measured"');
    });
  });

  test("on an ingredient that carries it, next to the measured flags", async () => {
    await withByClassFixture(async (tx) => {
      const entry = found(await ingredientEntry("carrot", tx));
      const basis = Object.fromEntries(entry.absorption.map((a) => [a.flag.compoundSlug, a.flag.basis]));
      expect(basis).toMatchObject({ [FIXTURE]: "by-class", "beta-carotene": "measured" });
      const html = renderToStaticMarkup(<IngredientEntryView entry={entry} />);
      expect(html).toContain('data-basis="by-class"');
      expect(html).toContain("By class: carotene");
      expect(html).toContain('data-basis="measured"');
    });
  });

  test("and never on the seeded data, where every rule was measured", async () => {
    const html = renderToStaticMarkup(<IngredientEntryView entry={found(await ingredientEntry("carrot"))} />);
    expect(html).toContain('data-basis="measured"');
    expect(html).not.toContain('data-basis="by-class"');
  });
});
