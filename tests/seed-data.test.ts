import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { CLASSES, COMPOUND_EFFECTS, EFFECTS, MODIFIERS, SOURCES } from "../data/seed/facts.ts";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { PANEL_COMPOUNDS, USDA_NUTRIENTS } from "../lib/usda/nutrients.ts";

const ingredientSlugs = new Set(INGREDIENTS.map((i) => i.slug));
const compoundSlugs = new Set(COMPOUNDS.map((c) => c.slug));

describe("seed data, as the build plan lists it", () => {
  test("15 hand-pinned ingredients, and the plan's 12 compounds, total fat, dietary fiber, the panel's 27 more and USDA's other 111, slugs unique", () => {
    expect(ingredientSlugs.size).toBe(15);
    expect(INGREDIENTS).toHaveLength(15);
    expect(compoundSlugs.size).toBe(152);
    expect(COMPOUNDS).toHaveLength(152);
    expect([compoundSlugs.has("total-fat"), compoundSlugs.has("dietary-fiber")]).toEqual([true, true]);
  });

  test("the panel's 30 nutrients and retinol are all seeded compounds", () => {
    expect(PANEL_COMPOUNDS.filter((slug) => !compoundSlugs.has(slug))).toEqual([]);
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

  test("every compound effect names a seeded compound, a seeded effect and a seeded source", () => {
    const effects = new Set(EFFECTS.map((e) => e.slug));
    const sources = new Set(SOURCES.map((s) => s.key));
    const unknown = COMPOUND_EFFECTS.flatMap((ce) => [
      ...(compoundSlugs.has(ce.compound) ? [] : [`compound ${ce.compound}`]),
      ...(effects.has(ce.effect) ? [] : [`effect ${ce.effect}`]),
      ...(sources.has(ce.source) ? [] : [`source ${ce.source}`]),
    ]);
    expect(COMPOUND_EFFECTS.length).toBeGreaterThan(0);
    expect(unknown).toEqual([]);
  });
});
