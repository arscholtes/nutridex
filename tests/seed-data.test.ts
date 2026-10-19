import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { CLASSES, MODIFIERS } from "../data/seed/facts.ts";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { USDA_NUTRIENTS } from "../lib/usda/nutrients.ts";

const ingredientSlugs = new Set(INGREDIENTS.map((i) => i.slug));
const compoundSlugs = new Set(COMPOUNDS.map((c) => c.slug));

describe("seed data, as the build plan lists it", () => {
  test("15 ingredients, and the plan's 12 compounds plus total fat and dietary fiber, slugs unique", () => {
    expect(ingredientSlugs.size).toBe(15);
    expect(INGREDIENTS).toHaveLength(15);
    expect(compoundSlugs.size).toBe(14);
    expect(COMPOUNDS).toHaveLength(14);
    expect([compoundSlugs.has("total-fat"), compoundSlugs.has("dietary-fiber")]).toEqual([true, true]);
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

  test("a class rule's measured members are members of its class, or the view would drop them silently", () => {
    const outside = MODIFIERS.flatMap((m) => {
      if (!("chebiClass" in m.target)) return [];
      const { chebiClass, measured } = m.target;
      const members = CLASSES.find((k) => k.chebiId === chebiClass)?.members ?? [];
      return measured.filter((slug) => !members.includes(slug)).map((slug) => `${m.source}: ${slug} is not in CHEBI:${chebiClass}`);
    });
    expect(outside).toEqual([]);
  });
});
