// The adult intake references as the seed generates them from Health Canada's tables: no database.
import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { ADULT_AGE_GROUPS, INTAKE_REFERENCES, INTAKE_SOURCES } from "../data/seed/intake-references.ts";
import { USDA_NUTRIENTS } from "../lib/usda/nutrients.ts";

const compoundSlugs = new Set(COMPOUNDS.map((c) => c.slug));
const nutrients = new Set(INTAKE_REFERENCES.map((r) => r.compoundSlug));

describe("adult intake references, as Health Canada's tables give them", () => {
  test("23 nutrients × 8 adult groups = 184 rows, each group once per nutrient", () => {
    expect(nutrients.size).toBe(23);
    expect(INTAKE_REFERENCES).toHaveLength(184);
    const groups = new Set(INTAKE_REFERENCES.map((r) => `${r.compoundSlug} ${r.sex} ${r.ageLow}`));
    expect(groups.size).toBe(184);
    expect(ADULT_AGE_GROUPS.map((g) => [g.ageLow, g.ageHigh])).toEqual([[19, 30], [31, 50], [51, 70], [71, null]]);
  });

  test("every row names a seeded compound and one of the two sources", () => {
    expect(INTAKE_REFERENCES.filter((r) => !compoundSlugs.has(r.compoundSlug)).map((r) => r.compoundSlug)).toEqual([]);
    const keys = new Set(INTAKE_SOURCES.map((s) => s.key));
    expect([...keys]).toEqual(["vitamins", "elements"]);
    expect(INTAKE_REFERENCES.filter((r) => !keys.has(r.source))).toEqual([]);
  });

  test("every row carries an RDA, an AI or a UL", () => {
    expect(INTAKE_REFERENCES.filter((r) => r.rda === null && r.ai === null && r.ul === null)).toEqual([]);
  });

  test("a row is an RDA or an AI, never both", () => {
    expect(INTAKE_REFERENCES.filter((r) => r.ai !== null && r.rda !== null)).toEqual([]);
    expect(INTAKE_REFERENCES.filter((r) => r.ai === null && r.rda === null)).toEqual([]);
  });

  test("the AI nutrients are the ones the tables mark *", () => {
    const ai = new Set(INTAKE_REFERENCES.filter((r) => r.ai !== null).map((r) => r.compoundSlug));
    expect([...ai].sort()).toEqual(["choline", "manganese", "pantothenic-acid", "potassium", "sodium", "vitamin-k1"]);
  });

  test("every row's unit is the compound's USDA unit, so a daily total and its reference add up", () => {
    const mismatched = INTAKE_REFERENCES.filter(
      (r) => r.unit !== USDA_NUTRIENTS[r.compoundSlug as keyof typeof USDA_NUTRIENTS].unit,
    ).map((r) => `${r.compoundSlug} in ${r.unit}`);
    expect(mismatched).toEqual([]);
  });

  test("a UL comes with what it applies to only where the tables footnote it", () => {
    const noted = new Set(INTAKE_REFERENCES.filter((r) => r.ulAppliesTo !== null).map((r) => r.compoundSlug));
    expect([...noted].sort()).toEqual(["folate", "magnesium", "niacin", "sodium", "vitamin-a", "vitamin-e"]);
    expect(INTAKE_REFERENCES.filter((r) => r.ul === null && r.ulAppliesTo !== null)).toEqual([]);
  });

  test("no energy, protein, carbohydrate or fat target: another app owns those", () => {
    for (const slug of ["energy", "protein", "carbohydrate", "total-fat", "saturated-fat"]) expect(nutrients.has(slug)).toBe(false);
  });

  test("the two sources are Health Canada's DRI tables, with no year claimed", () => {
    expect(INTAKE_SOURCES.map((s) => s.url)).toEqual([
      "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-vitamins.html",
      "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-elements.html",
    ]);
    expect(INTAKE_SOURCES.map((s) => s.year)).toEqual([null, null]);
  });
});
