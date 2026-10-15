// Which USDA FoodData Central nutrients are Foodi Dex compounds. Pure: no network, no database.
// Ids, names and units were read from USDA's own record for raw carrots (fdcId 170393).

export type FdcNutrient = { id: number; number?: string; name: string; unitName: string };
export type FdcFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  publicationDate?: string;
  foodNutrients: { nutrient: FdcNutrient; amount?: number }[];
};
export type CompoundAmount = { compoundSlug: string; amountPer100g: number; unit: string };

/** Compound slug → the USDA nutrient that measures it, as USDA names and units it. */
export const USDA_NUTRIENTS = {
  "beta-carotene": { id: 1107, name: "Carotene, beta", unit: "µg" },
  "alpha-carotene": { id: 1108, name: "Carotene, alpha", unit: "µg" },
  lycopene: { id: 1122, name: "Lycopene", unit: "µg" },
  "lutein-zeaxanthin": { id: 1123, name: "Lutein + zeaxanthin", unit: "µg" },
  "vitamin-k1": { id: 1185, name: "Vitamin K (phylloquinone)", unit: "µg" },
  "vitamin-c": { id: 1162, name: "Vitamin C, total ascorbic acid", unit: "mg" },
  "total-fat": { id: 1004, name: "Total lipid (fat)", unit: "g" },
  "dietary-fiber": { id: 1079, name: "Fiber, total dietary", unit: "g" },
} as const;

/**
 * The amount per 100 g of every mapped compound USDA reports for a food.
 * A nutrient USDA does not report, or reports without an amount, is left out rather than zeroed.
 * @param food [FdcFood] a FoodData Central food record
 * @return [CompoundAmount[]] one entry per mapped compound with a reported amount
 * @throws when a mapped nutrient's name or unit differs from the one this map was written against
 */
export function compoundAmounts(food: FdcFood): CompoundAmount[] {
  const reported = new Map(food.foodNutrients.map((n) => [n.nutrient.id, n]));
  const out: CompoundAmount[] = [];
  for (const [compoundSlug, expected] of Object.entries(USDA_NUTRIENTS)) {
    const entry = reported.get(expected.id);
    if (!entry) continue;
    const { name, unitName } = entry.nutrient;
    if (name !== expected.name || unitName !== expected.unit) {
      throw new Error(
        `USDA nutrient ${expected.id} in fdcId ${food.fdcId} is "${name}" in ${unitName}; ` +
          `expected "${expected.name}" in ${expected.unit} for ${compoundSlug}`,
      );
    }
    if (entry.amount === undefined) continue;
    out.push({ compoundSlug, amountPer100g: entry.amount, unit: expected.unit });
  }
  return out;
}
