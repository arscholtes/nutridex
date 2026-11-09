// Adult Dietary Reference Intakes, as Health Canada's DRI tables publish them, read on 2026-11-08.
// One definition per nutrient carries the eight adult groups in the tables' order: males 19–30,
// 31–50, 51–70, 71 and over, then females in the same order. A UL that is one number holds for every
// group; one that varies with age is given per age group and holds for both sexes, as the tables do.
//
// Left out because the Dex has no compound for them: biotin (vitamins table); chromium, iodine and
// molybdenum (elements table). Energy, protein, carbohydrate and fat are not stored: another app owns
// those targets.
//
// Copper is published in µg; the Dex stores copper in mg (USDA's unit), so it is kept here in mg.
// Sodium has no UL; its Chronic Disease Risk Reduction intake is kept in `ul` and `ulAppliesTo` says so.

export type IntakeSex = "male" | "female";
export type IntakeSourceKey = "vitamins" | "elements";

export type IntakeReferenceRow = {
  compoundSlug: string;
  sex: IntakeSex;
  ageLow: number;
  ageHigh: number | null;
  rda: number | null;
  ai: number | null;
  unit: string;
  ul: number | null;
  ulAppliesTo: string | null;
  source: IntakeSourceKey;
};

export type IntakeSource = { key: IntakeSourceKey; title: string; url: string; year: number | null; studyType: "database" };

// The pages' metadata gives 2025-11-19 as their last modification, a web-page date rather than the
// year the reference values were set, so no year is claimed.
export const INTAKE_SOURCES: readonly IntakeSource[] = [
  {
    key: "vitamins",
    title: "Dietary reference intakes tables: Reference values for vitamins (Health Canada)",
    url: "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-vitamins.html",
    year: null,
    studyType: "database",
  },
  {
    key: "elements",
    title: "Dietary reference intakes tables: Reference values for elements (Health Canada)",
    url: "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-elements.html",
    year: null,
    studyType: "database",
  },
];

/** The adult groups, in the tables' order within each sex. */
export const ADULT_AGE_GROUPS: readonly { ageLow: number; ageHigh: number | null }[] = [
  { ageLow: 19, ageHigh: 30 },
  { ageLow: 31, ageHigh: 50 },
  { ageLow: 51, ageHigh: 70 },
  { ageLow: 71, ageHigh: null },
];

type Eight = readonly [number, number, number, number, number, number, number, number];
type ByAge = readonly [number, number, number, number];

type Definition = {
  slug: string;
  unit: string;
  source: IntakeSourceKey;
  /** Whether the eight values are RDAs or AIs (marked * in the tables). */
  kind: "rda" | "ai";
  values: Eight;
  ul: number | ByAge | null;
  ulAppliesTo: string | null;
};

const SYNTHETIC_ONLY = (nutrient: string) =>
  `The UL for ${nutrient} applies only to synthetic forms obtained from supplements, fortified foods, or a combination of the two.`;

const DEFINITIONS: readonly Definition[] = [
  // Vitamins
  { slug: "vitamin-a", unit: "µg", source: "vitamins", kind: "rda", values: [900, 900, 900, 900, 700, 700, 700, 700], ul: 3000, ulAppliesTo: "UL as preformed vitamin A only." },
  { slug: "vitamin-c", unit: "mg", source: "vitamins", kind: "rda", values: [90, 90, 90, 90, 75, 75, 75, 75], ul: 2000, ulAppliesTo: null },
  { slug: "vitamin-d", unit: "µg", source: "vitamins", kind: "rda", values: [15, 15, 15, 20, 15, 15, 15, 20], ul: 100, ulAppliesTo: null },
  {
    slug: "vitamin-e", unit: "mg", source: "vitamins", kind: "rda", values: [15, 15, 15, 15, 15, 15, 15, 15], ul: 1000,
    ulAppliesTo: "The UL for vitamin E applies only to synthetic vitamin E (all isomeric forms) obtained from supplements, fortified foods, or a combination of the two.",
  },
  { slug: "vitamin-k1", unit: "µg", source: "vitamins", kind: "ai", values: [120, 120, 120, 120, 90, 90, 90, 90], ul: null, ulAppliesTo: null },
  { slug: "thiamin", unit: "mg", source: "vitamins", kind: "rda", values: [1.2, 1.2, 1.2, 1.2, 1.1, 1.1, 1.1, 1.1], ul: null, ulAppliesTo: null },
  { slug: "riboflavin", unit: "mg", source: "vitamins", kind: "rda", values: [1.3, 1.3, 1.3, 1.3, 1.1, 1.1, 1.1, 1.1], ul: null, ulAppliesTo: null },
  { slug: "niacin", unit: "mg", source: "vitamins", kind: "rda", values: [16, 16, 16, 16, 14, 14, 14, 14], ul: 35, ulAppliesTo: SYNTHETIC_ONLY("niacin") },
  { slug: "vitamin-b6", unit: "mg", source: "vitamins", kind: "rda", values: [1.3, 1.3, 1.7, 1.7, 1.3, 1.3, 1.5, 1.5], ul: 100, ulAppliesTo: null },
  { slug: "folate", unit: "µg", source: "vitamins", kind: "rda", values: [400, 400, 400, 400, 400, 400, 400, 400], ul: 1000, ulAppliesTo: SYNTHETIC_ONLY("folate") },
  { slug: "vitamin-b12", unit: "µg", source: "vitamins", kind: "rda", values: [2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4], ul: null, ulAppliesTo: null },
  { slug: "pantothenic-acid", unit: "mg", source: "vitamins", kind: "ai", values: [5, 5, 5, 5, 5, 5, 5, 5], ul: null, ulAppliesTo: null },
  { slug: "choline", unit: "mg", source: "vitamins", kind: "ai", values: [550, 550, 550, 550, 425, 425, 425, 425], ul: 3500, ulAppliesTo: null },
  // Elements
  { slug: "calcium", unit: "mg", source: "elements", kind: "rda", values: [1000, 1000, 1000, 1200, 1000, 1000, 1200, 1200], ul: [2500, 2500, 2000, 2000], ulAppliesTo: null },
  { slug: "copper", unit: "mg", source: "elements", kind: "rda", values: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9], ul: 10, ulAppliesTo: null },
  { slug: "iron", unit: "mg", source: "elements", kind: "rda", values: [8, 8, 8, 8, 18, 18, 8, 8], ul: 45, ulAppliesTo: null },
  {
    slug: "magnesium", unit: "mg", source: "elements", kind: "rda", values: [400, 420, 420, 420, 310, 320, 320, 320], ul: 350,
    ulAppliesTo: "The UL for magnesium represents intake from a pharmacological agent only and does not include intake from food and water.",
  },
  { slug: "manganese", unit: "mg", source: "elements", kind: "ai", values: [2.3, 2.3, 2.3, 2.3, 1.8, 1.8, 1.8, 1.8], ul: 11, ulAppliesTo: null },
  { slug: "phosphorus", unit: "mg", source: "elements", kind: "rda", values: [700, 700, 700, 700, 700, 700, 700, 700], ul: [4000, 4000, 4000, 3000], ulAppliesTo: null },
  { slug: "selenium", unit: "µg", source: "elements", kind: "rda", values: [55, 55, 55, 55, 55, 55, 55, 55], ul: 400, ulAppliesTo: null },
  { slug: "zinc", unit: "mg", source: "elements", kind: "rda", values: [11, 11, 11, 11, 8, 8, 8, 8], ul: 40, ulAppliesTo: null },
  { slug: "potassium", unit: "mg", source: "elements", kind: "ai", values: [3400, 3400, 3400, 3400, 2600, 2600, 2600, 2600], ul: null, ulAppliesTo: null },
  {
    slug: "sodium", unit: "mg", source: "elements", kind: "ai", values: [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500], ul: 2300,
    ulAppliesTo: "2300 mg is the Chronic Disease Risk Reduction intake (CDRR), the level above which intake reduction is expected to reduce chronic disease risk; no UL has been established for sodium.",
  },
];

const SEXES: readonly IntakeSex[] = ["male", "female"];

/** @return [number] the UL for one age group: the single UL, or the one given for that group */
function ulFor(ul: Definition["ul"], ageIndex: number): number | null {
  if (ul === null || typeof ul === "number") return ul;
  return ul[ageIndex];
}

/** Every adult reference row the tables give for a Dex compound: 23 nutrients × 8 groups. */
export const INTAKE_REFERENCES: readonly IntakeReferenceRow[] = DEFINITIONS.flatMap((d) =>
  SEXES.flatMap((sex, sexIndex) =>
    ADULT_AGE_GROUPS.map((group, ageIndex) => {
      const value = d.values[sexIndex * ADULT_AGE_GROUPS.length + ageIndex];
      return {
        compoundSlug: d.slug,
        sex,
        ageLow: group.ageLow,
        ageHigh: group.ageHigh,
        rda: d.kind === "rda" ? value : null,
        ai: d.kind === "ai" ? value : null,
        unit: d.unit,
        ul: ulFor(d.ul, ageIndex),
        ulAppliesTo: d.ulAppliesTo,
        source: d.source,
      };
    }),
  ),
);
