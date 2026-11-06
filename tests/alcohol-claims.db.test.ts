// A drink over 1.2% alcohol by volume may bear no health claim, and no nutrition claim but about its alcohol
// or energy: EU Regulation 1924/2006, Article 4(3) and (4). The Dex uses that law's "source" bar to decide what a
// food claims, unlocks and is graded by, so a strong drink clears no bar anywhere, on the web or in the apps.
import { describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { effectEntry, ingredientEntry, listEntries } from "../lib/db/dex.ts";
import { revealedEntries } from "../lib/db/encounters.ts";
import { buildSnapshot } from "../lib/native/snapshot.ts";

const STRONG = "test-sunrise";
const SOFT = "test-juice";

/**
 * Runs a check with two made-up drinks holding the same vitamin C, above its 12 mg bar and below the richest
 * food's, one of them 11 g alcohol per 100 g. Nothing is kept.
 * @param check [(q) => Promise<void>] the assertions, reading through the transaction
 */
async function withDrinks(check: (q: typeof sql) => Promise<void>) {
  const rollback = new Error("roll back");
  await expect(
    sql.begin(async (tx) => {
      const q = tx as unknown as typeof sql;
      const [vitaminC] = await tx<{ id: string }[]>`select id from compound where slug = 'vitamin-c'`;
      const [alcohol] = await tx<{ id: string }[]>`select id from compound where slug = 'alcohol'`;
      for (const [slug, name, grams] of [[STRONG, "Test sunrise", 11], [SOFT, "Test juice", 0]] as const) {
        const [food] = await tx<{ id: string }[]>`
          insert into ingredient (slug, name, category, image_url) values (${slug}, ${name}, 'drink', '/art/stand-ins/drink.svg') returning id`;
        await tx`insert into ingredient_compound (ingredient_id, compound_id, amount_per_100g, unit) values (${food.id}, ${vitaminC.id}, 20, 'mg')`;
        await tx`insert into ingredient_compound (ingredient_id, compound_id, amount_per_100g, unit) values (${food.id}, ${alcohol.id}, ${grams}, 'g')`;
      }
      await check(q);
      throw rollback;
    }),
  ).rejects.toBe(rollback);
}

describe("a drink over 1.2% alcohol", () => {
  test("shows no claim on its page, and says why", async () => {
    await withDrinks(async (q) => {
      const strong = (await ingredientEntry(STRONG, q))!;
      expect(strong.effects).toEqual([]);
      expect(strong.tiles).toEqual([]);
      expect(strong.bearsClaims).toBe(false);
      const soft = (await ingredientEntry(SOFT, q))!;
      expect(soft.effects.map((e) => e.effect.slug)).toContain("immune-system");
      expect(soft.bearsClaims).toBe(true);
    });
  });

  test("earns no grade from a claim, on its page or its card", async () => {
    await withDrinks(async (q) => {
      expect((await ingredientEntry(STRONG, q))!.bestGrade).toBeNull();
      expect((await listEntries({ q: "test sunrise", kind: "ingredient" }, q))[0].bestGrade).toBeNull();
      expect((await ingredientEntry(SOFT, q))!.bestGrade).not.toBeNull();
    });
  });

  test("is not listed as a food behind an effect", async () => {
    await withDrinks(async (q) => {
      const foods = (await effectEntry("immune-system", q))!.foods.find((f) => f.compound.slug === "vitamin-c")!.ranked.map((f) => f.slug);
      expect(foods).toContain(SOFT);
      expect(foods).not.toContain(STRONG);
    });
  });

  test("unlocks no effect, and no nutrient by clearing its bar", async () => {
    await withDrinks(async (q) => {
      const strong = await revealedEntries([STRONG], q);
      expect([...strong.effects]).toEqual([]);
      expect(strong.compounds.has("vitamin-c")).toBe(false);
      expect(strong.compounds.has("alcohol")).toBe(true);
      const soft = await revealedEntries([SOFT], q);
      expect(soft.effects.has("immune-system")).toBe(true);
      expect(soft.compounds.has("vitamin-c")).toBe(true);
    });
  });

  test("unlocks the same in the apps as on the web", async () => {
    await withDrinks(async (q) => {
      const { reveals } = await buildSnapshot(q);
      for (const food of [STRONG, SOFT]) {
        const web = await revealedEntries([food], q);
        expect(new Set(reveals[food].compounds), food).toEqual(web.compounds);
        expect(new Set(reveals[food].effects), food).toEqual(web.effects);
      }
    });
  });
});
