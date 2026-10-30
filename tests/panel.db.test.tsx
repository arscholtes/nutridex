// The nutrient panel, against a database `npm run seed` has filled from USDA.
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, test } from "vitest";
import { IngredientEntryView } from "../components/ingredient-entry.tsx";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { sql } from "../lib/db/client.ts";
import { ingredientEntry, type IngredientEntry } from "../lib/db/dex.ts";
import { loadFacts } from "../lib/db/engine-input.ts";
import { PANEL, PANEL_COMPOUNDS } from "../lib/usda/nutrients.ts";

afterAll(() => sql.end());

const panel = PANEL.map((p) => p.slug);

describe("the nutrient panel, as the seed imports it", () => {
  test("all 30 panel nutrients and retinol are compounds", async () => {
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from compound where slug = any(${PANEL_COMPOUNDS})`;
    expect(n).toBe(31);
  });

  test("the 15 seeded foods fill 444 of 450 cells, and the 6 gaps are the ones USDA leaves empty", async () => {
    const gaps = await sql<{ food: string; nutrient: string }[]>`
      select i.slug as food, c.slug as nutrient
      from ingredient i cross join compound c
      where i.slug = any(${INGREDIENTS.map((i) => i.slug)}) and c.slug = any(${panel})
        and not exists (
          select 1 from ingredient_compound ic
          where ic.ingredient_id = i.id and ic.compound_id = c.id and ic.amount_per_100g is not null
        )
      order by 1, 2`;
    expect(INGREDIENTS.length * panel.length - gaps.length).toBe(444);
    expect(gaps.map((g) => `${g.food} · ${g.nutrient}`)).toEqual([
      "butternut-squash · choline",
      "granny-smith-apple · folate",
      "granny-smith-apple · saturated-fat",
      "granny-smith-apple · vitamin-b12",
      "granny-smith-apple · vitamin-c",
      "granny-smith-apple · vitamin-d",
    ]);
  });

  test("energy reaches the engine in kcal, as USDA reports it", async () => {
    const facts = await loadFacts(["carrot"]);
    expect(facts.amounts.find((a) => a.compoundSlug === "energy")).toMatchObject({ amountPer100g: 41, unit: "kcal" });
  });
});

const found = (entry: IngredientEntry | null): IngredientEntry => {
  if (!entry) throw new Error("no such ingredient");
  return entry;
};

describe("a food's panel on its Dex entry", () => {
  test("lists the 30 nutrients in panel order, with a gap as missing rather than zero", async () => {
    const apple = found(await ingredientEntry("granny-smith-apple"));
    expect(apple.panel.map((r) => r.slug)).toEqual(panel);
    expect(apple.panel.filter((r) => r.amount === null).map((r) => r.slug)).toEqual([
      "saturated-fat", "vitamin-c", "vitamin-d", "folate", "vitamin-b12",
    ]);
    expect(apple.panel.find((r) => r.slug === "energy")).toMatchObject({ name: "Energy", amount: 58, unit: "kcal" });
  });

  test("the page shows each gap as missing: 5 for the apple, 1 for butternut squash", async () => {
    const missing = (html: string) => html.match(/>missing</g)?.length ?? 0;
    const apple = renderToStaticMarkup(<IngredientEntryView entry={found(await ingredientEntry("granny-smith-apple"))} />);
    const squash = found(await ingredientEntry("butternut-squash"));
    expect(missing(apple)).toBe(5);
    expect(missing(renderToStaticMarkup(<IngredientEntryView entry={squash} />))).toBe(1);
    expect(squash.panel.find((r) => r.amount === null)?.slug).toBe("choline");
  });

  test("panel nutrients sit in the panel only, so What is in it keeps to the Dex's other compounds", async () => {
    const carrot = found(await ingredientEntry("carrot"));
    const shown = [...carrot.compounds.map((c) => c.slug), ...carrot.absent.none.map((c) => c.slug), ...carrot.absent.unmeasured.map((c) => c.slug)];
    expect(shown.filter((slug) => PANEL_COMPOUNDS.includes(slug))).toEqual([]);
    expect(carrot.compounds.map((c) => c.slug)).toContain("beta-carotene");
  });
});
