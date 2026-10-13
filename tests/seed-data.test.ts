import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { USDA_NUTRIENTS } from "../lib/usda/nutrients.ts";

const ingredientSlugs = new Set(INGREDIENTS.map((i) => i.slug));
const compoundSlugs = new Set(COMPOUNDS.map((c) => c.slug));

describe("seed data, as the build plan lists it", () => {
  test("15 ingredients and 12 compounds, slugs unique", () => {
    expect(ingredientSlugs.size).toBe(15);
    expect(INGREDIENTS).toHaveLength(15);
    expect(compoundSlugs.size).toBe(12);
    expect(COMPOUNDS).toHaveLength(12);
  });

  test("every main seed ingredient a compound names is a seeded ingredient", () => {
    const unknown = COMPOUNDS.flatMap((c) =>
      c.mainIngredients.filter((s) => !ingredientSlugs.has(s)).map((s) => `${c.slug} -> ${s}`),
    );
    expect(unknown).toEqual([]);
  });

  test("every compound USDA can fill is a seeded compound", () => {
    expect(Object.keys(USDA_NUTRIENTS).filter((s) => !compoundSlugs.has(s))).toEqual([]);
  });

  test("every ingredient is pinned to one USDA food, and no food is pinned twice", () => {
    const ids = INGREDIENTS.map((i) => i.usdaFdcId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
