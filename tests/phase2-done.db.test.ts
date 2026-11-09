// Phase 2's "Done when", against a database `npm run seed` has filled: the juice recipe returns the
// "no fat" and "fiber lost" flags, and adding olive oil flips carotenoids to "enhanced".
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { loadFacts, loadRecipe } from "../lib/db/engine-input.ts";
import { DEFAULT_SETTINGS, recipeProfile, type RecipeInput } from "epistasis";

afterAll(() => sql.end());

const CAROTENOIDS = ["alpha-carotene", "beta-carotene", "lutein-zeaxanthin", "lycopene"];

async function profileOf(recipe: RecipeInput) {
  const facts = await loadFacts(recipe.ingredients.map((ri) => ri.ingredientSlug));
  return recipeProfile(recipe, facts, DEFAULT_SETTINGS, []);
}

describe("the juice recipe", () => {
  test("is Granny Smith, carrot, beet and kale, juiced", async () => {
    const juice = await loadRecipe("juice");
    expect(juice.ingredients.map((ri) => [ri.ingredientSlug, ri.prepMethod])).toEqual([
      ["granny-smith-apple", "juiced"],
      ["carrot", "juiced"],
      ["beet", "juiced"],
      ["kale", "juiced"],
    ]);
  });

  test('flags "no fat": every carotenoid it carries is a missed opportunity, suggesting a fat', async () => {
    const profile = await profileOf(await loadRecipe("juice"));
    const fat = profile.absorption.filter((a) => a.reason.includes("g of fat per serving"));
    expect(fat.map((a) => a.compoundSlug).sort()).toEqual(CAROTENOIDS);
    for (const flag of fat) expect(flag).toMatchObject({ status: "missed", suggestion: "Add a fat, such as olive oil" });
  });

  test('flags "fiber lost": juicing decreases every ingredient\'s fiber and the apple\'s pectin', async () => {
    const profile = await profileOf(await loadRecipe("juice"));
    const fiber = profile.prep.filter((p) => p.compoundSlug === "dietary-fiber");
    expect(fiber.map((p) => [p.ingredientSlug, p.method, p.direction])).toEqual([
      ["granny-smith-apple", "juiced", "decreases"],
      ["carrot", "juiced", "decreases"],
      ["beet", "juiced", "decreases"],
      ["kale", "juiced", "decreases"],
    ]);
    expect(fiber[0].note).toMatch(/pulp/);
    const pectin = profile.prep.filter((p) => p.compoundSlug === "pectin");
    expect(pectin).toEqual([expect.objectContaining({ ingredientSlug: "granny-smith-apple", method: "juiced", direction: "decreases" })]);
  });

  test("still shows the fiber it had before juicing, since no source gives a retention factor for all four", async () => {
    const profile = await profileOf(await loadRecipe("juice"));
    const fiber = profile.perServing.find((t) => t.compoundSlug === "dietary-fiber")!;
    expect(fiber.unit).toBe("g");
    expect(fiber.amount).toBeGreaterThan(5);
    expect(profile.prep.filter((p) => p.compoundSlug === "dietary-fiber").every((p) => p.retentionFactor === null)).toBe(true);
  });

  test('adding olive oil flips every carotenoid to "enhanced"', async () => {
    const juice = await loadRecipe("juice");
    const withOil: RecipeInput = {
      ...juice,
      ingredients: [...juice.ingredients, { id: "olive-oil-added", ingredientSlug: "olive-oil", grams: 13.5, prepMethod: "raw", retentionFamily: null }],
    };
    const profile = await profileOf(withOil);
    const fat = profile.absorption.filter((a) => a.reason.includes("g of fat per serving"));
    expect(fat.map((a) => [a.compoundSlug, a.status]).sort()).toEqual(CAROTENOIDS.map((c) => [c, "enhanced"]));
  });
});

describe("the facts behind those flags", () => {
  test("every modifier, caution and effect row has a source and a grade", async () => {
    const [{ ungraded }] = await sql`
      select (select count(*) from absorption_modifier where source_id is null or evidence_grade is null)
           + (select count(*) from caution where source_id is null or evidence_grade is null)
           + (select count(*) from compound_effect where source_id is null or evidence_grade is null) as ungraded`;
    expect(Number(ungraded)).toBe(0);
  });

  test("every prep effect has a source", async () => {
    const [{ unsourced }] = await sql`select count(*)::int as unsourced from prep_effect where source_id is null`;
    expect(unsourced).toBe(0);
  });

  test("prep_effect.direction accepts only decreases, increases or unchanged", async () => {
    await expect(sql`insert into prep_effect (prep_method, direction) values ('juiced', 'sideways')`).rejects.toThrow(/prep_effect_direction_known/);
  });
});
