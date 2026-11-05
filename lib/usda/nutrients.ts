// Which USDA FoodData Central nutrients are NutriDex compounds. Pure: no network, no database.
// Ids, names and units were read from USDA's own record for raw carrots (fdcId 170393).

export type FdcNutrient = { id: number; number?: string; name: string; unitName: string };
export type FdcFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  publicationDate?: string;
  foodCategory?: { description: string };
  foodPortions?: unknown[];
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
  "water": { id: 1051, name: "Water", unit: "g" },
  "ash": { id: 1007, name: "Ash", unit: "g" },
  "sucrose": { id: 1010, name: "Sucrose", unit: "g" },
  "glucose": { id: 1011, name: "Glucose", unit: "g" },
  "fructose": { id: 1012, name: "Fructose", unit: "g" },
  "lactose": { id: 1013, name: "Lactose", unit: "g" },
  "maltose": { id: 1014, name: "Maltose", unit: "g" },
  "galactose": { id: 1075, name: "Galactose", unit: "g" },
  "starch": { id: 1009, name: "Starch", unit: "g" },
  "fluoride": { id: 1099, name: "Fluoride, F", unit: "µg" },
  "folate-total": { id: 1177, name: "Folate, total", unit: "µg" },
  "folic-acid": { id: 1186, name: "Folic acid", unit: "µg" },
  "folate-food": { id: 1187, name: "Folate, food", unit: "µg" },
  "betaine": { id: 1198, name: "Betaine", unit: "mg" },
  "vitamin-b12-added": { id: 1246, name: "Vitamin B-12, added", unit: "µg" },
  "beta-cryptoxanthin": { id: 1120, name: "Cryptoxanthin, beta", unit: "µg" },
  "vitamin-e-added": { id: 1242, name: "Vitamin E, added", unit: "mg" },
  "tocopherol-beta": { id: 1125, name: "Tocopherol, beta", unit: "mg" },
  "tocopherol-gamma": { id: 1126, name: "Tocopherol, gamma", unit: "mg" },
  "tocopherol-delta": { id: 1127, name: "Tocopherol, delta", unit: "mg" },
  "tocotrienol-alpha": { id: 1128, name: "Tocotrienol, alpha", unit: "mg" },
  "tocotrienol-beta": { id: 1129, name: "Tocotrienol, beta", unit: "mg" },
  "tocotrienol-gamma": { id: 1130, name: "Tocotrienol, gamma", unit: "mg" },
  "tocotrienol-delta": { id: 1131, name: "Tocotrienol, delta", unit: "mg" },
  "vitamin-d2": { id: 1111, name: "Vitamin D2 (ergocalciferol)", unit: "µg" },
  "vitamin-d3": { id: 1112, name: "Vitamin D3 (cholecalciferol)", unit: "µg" },
  "vitamin-k-dihydrophylloquinone": { id: 1184, name: "Vitamin K (Dihydrophylloquinone)", unit: "µg" },
  "vitamin-k2-mk4": { id: 1183, name: "Vitamin K (Menaquinone-4)", unit: "µg" },
  "total-monounsaturated-fat": { id: 1292, name: "Fatty acids, total monounsaturated", unit: "g" },
  "total-polyunsaturated-fat": { id: 1293, name: "Fatty acids, total polyunsaturated", unit: "g" },
  "total-trans-fat": { id: 1257, name: "Fatty acids, total trans", unit: "g" },
  "total-trans-monoenoic-fat": { id: 1329, name: "Fatty acids, total trans-monoenoic", unit: "g" },
  "total-trans-polyenoic-fat": { id: 1331, name: "Fatty acids, total trans-polyenoic", unit: "g" },
  "butyric-acid": { id: 1259, name: "SFA 4:0", unit: "g" },
  "caproic-acid": { id: 1260, name: "SFA 6:0", unit: "g" },
  "caprylic-acid": { id: 1261, name: "SFA 8:0", unit: "g" },
  "capric-acid": { id: 1262, name: "SFA 10:0", unit: "g" },
  "lauric-acid": { id: 1263, name: "SFA 12:0", unit: "g" },
  "tridecylic-acid": { id: 1332, name: "SFA 13:0", unit: "g" },
  "myristic-acid": { id: 1264, name: "SFA 14:0", unit: "g" },
  "pentadecylic-acid": { id: 1299, name: "SFA 15:0", unit: "g" },
  "palmitic-acid": { id: 1265, name: "SFA 16:0", unit: "g" },
  "margaric-acid": { id: 1300, name: "SFA 17:0", unit: "g" },
  "stearic-acid": { id: 1266, name: "SFA 18:0", unit: "g" },
  "arachidic-acid": { id: 1267, name: "SFA 20:0", unit: "g" },
  "behenic-acid": { id: 1273, name: "SFA 22:0", unit: "g" },
  "lignoceric-acid": { id: 1301, name: "SFA 24:0", unit: "g" },
  "tetradecenoic-acid": { id: 1274, name: "MUFA 14:1", unit: "g" },
  "pentadecenoic-acid": { id: 1333, name: "MUFA 15:1", unit: "g" },
  "hexadecenoic-acid": { id: 1275, name: "MUFA 16:1", unit: "g" },
  "hexadecenoic-acid-cis": { id: 1314, name: "MUFA 16:1 c", unit: "g" },
  "heptadecenoic-acid": { id: 1323, name: "MUFA 17:1", unit: "g" },
  "octadecenoic-acid": { id: 1268, name: "MUFA 18:1", unit: "g" },
  "octadecenoic-acid-cis": { id: 1315, name: "MUFA 18:1 c", unit: "g" },
  "vaccenic-acid-trans": { id: 1412, name: "MUFA 18:1-11 t (18:1t n-7)", unit: "g" },
  "eicosenoic-acid": { id: 1277, name: "MUFA 20:1", unit: "g" },
  "docosenoic-acid": { id: 1279, name: "MUFA 22:1", unit: "g" },
  "docosenoic-acid-cis": { id: 1317, name: "MUFA 22:1 c", unit: "g" },
  "tetracosenoic-acid-cis": { id: 1312, name: "MUFA 24:1 c", unit: "g" },
  "octadecadienoic-acid": { id: 1269, name: "PUFA 18:2", unit: "g" },
  "linoleic-acid": { id: 1316, name: "PUFA 18:2 n-6 c,c", unit: "g" },
  "conjugated-linoleic-acids": { id: 1311, name: "PUFA 18:2 CLAs", unit: "g" },
  "octadecadienoic-acid-isomers": { id: 1307, name: "PUFA 18:2 i", unit: "g" },
  "octadecatrienoic-acid": { id: 1270, name: "PUFA 18:3", unit: "g" },
  "alpha-linolenic-acid": { id: 1404, name: "PUFA 18:3 n-3 c,c,c (ALA)", unit: "g" },
  "gamma-linolenic-acid": { id: 1321, name: "PUFA 18:3 n-6 c,c,c", unit: "g" },
  "octadecatrienoic-acid-isomers": { id: 1409, name: "PUFA 18:3i", unit: "g" },
  "octadecatetraenoic-acid": { id: 1276, name: "PUFA 18:4", unit: "g" },
  "eicosadienoic-acid": { id: 1313, name: "PUFA 20:2 n-6 c,c", unit: "g" },
  "eicosatrienoic-acid": { id: 1325, name: "PUFA 20:3", unit: "g" },
  "eicosatrienoic-acid-n3": { id: 1405, name: "PUFA 20:3 n-3", unit: "g" },
  "dihomo-gamma-linolenic-acid": { id: 1406, name: "PUFA 20:3 n-6", unit: "g" },
  "eicosatetraenoic-acid": { id: 1271, name: "PUFA 20:4", unit: "g" },
  "arachidonic-acid": { id: 1408, name: "PUFA 20:4 n-6", unit: "g" },
  "epa": { id: 1278, name: "PUFA 20:5 n-3 (EPA)", unit: "g" },
  "heneicosapentaenoic-acid": { id: 1410, name: "PUFA 21:5", unit: "g" },
  "docosatetraenoic-acid": { id: 1411, name: "PUFA 22:4", unit: "g" },
  "dpa": { id: 1280, name: "PUFA 22:5 n-3 (DPA)", unit: "g" },
  "dha": { id: 1272, name: "PUFA 22:6 n-3 (DHA)", unit: "g" },
  "trans-hexadecenoic-acid": { id: 1303, name: "TFA 16:1 t", unit: "g" },
  "trans-octadecenoic-acid": { id: 1304, name: "TFA 18:1 t", unit: "g" },
  "trans-docosenoic-acid": { id: 1305, name: "TFA 22:1 t", unit: "g" },
  "trans-octadecadienoic-acid": { id: 1306, name: "TFA 18:2 t not further defined", unit: "g" },
  "trans-trans-octadecadienoic-acid": { id: 1310, name: "TFA 18:2 t,t", unit: "g" },
  "cholesterol": { id: 1253, name: "Cholesterol", unit: "mg" },
  "phytosterols": { id: 1283, name: "Phytosterols", unit: "mg" },
  "stigmasterol": { id: 1285, name: "Stigmasterol", unit: "mg" },
  "campesterol": { id: 1286, name: "Campesterol", unit: "mg" },
  "beta-sitosterol": { id: 1288, name: "Beta-sitosterol", unit: "mg" },
  "tryptophan": { id: 1210, name: "Tryptophan", unit: "g" },
  "threonine": { id: 1211, name: "Threonine", unit: "g" },
  "isoleucine": { id: 1212, name: "Isoleucine", unit: "g" },
  "leucine": { id: 1213, name: "Leucine", unit: "g" },
  "lysine": { id: 1214, name: "Lysine", unit: "g" },
  "methionine": { id: 1215, name: "Methionine", unit: "g" },
  "cystine": { id: 1216, name: "Cystine", unit: "g" },
  "phenylalanine": { id: 1217, name: "Phenylalanine", unit: "g" },
  "tyrosine": { id: 1218, name: "Tyrosine", unit: "g" },
  "valine": { id: 1219, name: "Valine", unit: "g" },
  "arginine": { id: 1220, name: "Arginine", unit: "g" },
  "histidine": { id: 1221, name: "Histidine", unit: "g" },
  "alanine": { id: 1222, name: "Alanine", unit: "g" },
  "aspartic-acid": { id: 1223, name: "Aspartic acid", unit: "g" },
  "glutamic-acid": { id: 1224, name: "Glutamic acid", unit: "g" },
  "glycine": { id: 1225, name: "Glycine", unit: "g" },
  "proline": { id: 1226, name: "Proline", unit: "g" },
  "serine": { id: 1227, name: "Serine", unit: "g" },
  "hydroxyproline": { id: 1228, name: "Hydroxyproline", unit: "g" },
  "alcohol": { id: 1018, name: "Alcohol, ethyl", unit: "g" },
  "caffeine": { id: 1057, name: "Caffeine", unit: "mg" },
  "theobromine": { id: 1058, name: "Theobromine", unit: "mg" },
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
