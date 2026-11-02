// Which USDA FoodData Central nutrients are NutriDex compounds. Pure: no network, no database.
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
  energy: { id: 1008, name: "Energy", unit: "kcal" },
  protein: { id: 1003, name: "Protein", unit: "g" },
  "saturated-fat": { id: 1258, name: "Fatty acids, total saturated", unit: "g" },
  carbohydrate: { id: 1005, name: "Carbohydrate, by difference", unit: "g" },
  "total-sugars": { id: 2000, name: "Total Sugars", unit: "g" },
  "vitamin-a": { id: 1106, name: "Vitamin A, RAE", unit: "µg" },
  retinol: { id: 1105, name: "Retinol", unit: "µg" },
  "vitamin-d": { id: 1114, name: "Vitamin D (D2 + D3)", unit: "µg" },
  "vitamin-e": { id: 1109, name: "Vitamin E (alpha-tocopherol)", unit: "mg" },
  thiamin: { id: 1165, name: "Thiamin", unit: "mg" },
  riboflavin: { id: 1166, name: "Riboflavin", unit: "mg" },
  niacin: { id: 1167, name: "Niacin", unit: "mg" },
  "pantothenic-acid": { id: 1170, name: "Pantothenic acid", unit: "mg" },
  "vitamin-b6": { id: 1175, name: "Vitamin B-6", unit: "mg" },
  folate: { id: 1190, name: "Folate, DFE", unit: "µg" },
  "vitamin-b12": { id: 1178, name: "Vitamin B-12", unit: "µg" },
  choline: { id: 1180, name: "Choline, total", unit: "mg" },
  calcium: { id: 1087, name: "Calcium, Ca", unit: "mg" },
  iron: { id: 1089, name: "Iron, Fe", unit: "mg" },
  magnesium: { id: 1090, name: "Magnesium, Mg", unit: "mg" },
  phosphorus: { id: 1091, name: "Phosphorus, P", unit: "mg" },
  potassium: { id: 1092, name: "Potassium, K", unit: "mg" },
  sodium: { id: 1093, name: "Sodium, Na", unit: "mg" },
  zinc: { id: 1095, name: "Zinc, Zn", unit: "mg" },
  copper: { id: 1098, name: "Copper, Cu", unit: "mg" },
  manganese: { id: 1101, name: "Manganese, Mn", unit: "mg" },
  selenium: { id: 1103, name: "Selenium, Se", unit: "µg" },
} as const;

export type PanelGroup = "macro" | "vitamin" | "mineral";

/**
 * The 30 nutrients every food's panel shows, in display order. Retinol is mapped above but not
 * shown: it is there for vitamin A's upper limit, which counts preformed vitamin A only.
 * Iodine and biotin are left out because SR Legacy almost never measures them.
 */
export const PANEL = [
  { slug: "energy", group: "macro" },
  { slug: "protein", group: "macro" },
  { slug: "total-fat", group: "macro" },
  { slug: "saturated-fat", group: "macro" },
  { slug: "carbohydrate", group: "macro" },
  { slug: "dietary-fiber", group: "macro" },
  { slug: "total-sugars", group: "macro" },
  { slug: "vitamin-a", group: "vitamin" },
  { slug: "vitamin-c", group: "vitamin" },
  { slug: "vitamin-d", group: "vitamin" },
  { slug: "vitamin-e", group: "vitamin" },
  { slug: "vitamin-k1", group: "vitamin" },
  { slug: "thiamin", group: "vitamin" },
  { slug: "riboflavin", group: "vitamin" },
  { slug: "niacin", group: "vitamin" },
  { slug: "pantothenic-acid", group: "vitamin" },
  { slug: "vitamin-b6", group: "vitamin" },
  { slug: "folate", group: "vitamin" },
  { slug: "vitamin-b12", group: "vitamin" },
  { slug: "choline", group: "vitamin" },
  { slug: "calcium", group: "mineral" },
  { slug: "iron", group: "mineral" },
  { slug: "magnesium", group: "mineral" },
  { slug: "phosphorus", group: "mineral" },
  { slug: "potassium", group: "mineral" },
  { slug: "sodium", group: "mineral" },
  { slug: "zinc", group: "mineral" },
  { slug: "copper", group: "mineral" },
  { slug: "manganese", group: "mineral" },
  { slug: "selenium", group: "mineral" },
] as const satisfies readonly { slug: keyof typeof USDA_NUTRIENTS; group: PanelGroup }[];

/** Every compound the panel imports: the 30 it shows, and retinol. */
export const PANEL_COMPOUNDS: string[] = [...PANEL.map((p) => p.slug), "retinol"];

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
