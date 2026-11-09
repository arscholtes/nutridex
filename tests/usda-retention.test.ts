// Reading USDA's Table of Nutrient Retention Factors whole, and deciding which of its families a Dex food cooks like.
import { readFileSync } from "node:fs";
import { PREP_METHODS } from "epistasis";
import { describe, expect, test } from "vitest";
import { COOKING_METHODS, RETENTION_FAMILIES, parseRetentionTable, retentionFamilyOf } from "../lib/usda/retention.ts";

const rows = parseRetentionTable(readFileSync("data/usda/retention-factors-r6.csv", "utf8"));
const codes = new Map(rows.map((r) => [r.retentionCode, r] as const).reverse());
const code = (n: number) => {
  const row = codes.get(n);
  if (!row) throw new Error(`no code ${n}`);
  return row;
};

describe("parseRetentionTable", () => {
  test("reads every row: 7,018 factors over 270 food-and-cooking codes", () => {
    expect(rows).toHaveLength(7018);
    expect(codes.size).toBe(270);
  });

  test("every code has a family from the known list, and every family in the list is used", () => {
    const families = new Set(rows.map((r) => r.family));
    for (const f of families) expect(RETENTION_FAMILIES).toContain(f);
    for (const f of RETENTION_FAMILIES) expect(families).toContain(f);
  });

  test("every method it names is one the engine knows, and the ten cooking methods are among them", () => {
    const methods = new Set(rows.flatMap((r) => r.prepMethods));
    for (const m of methods) expect(PREP_METHODS).toContain(m);
    for (const m of COOKING_METHODS) expect(methods).toContain(m);
  });

  test("factors are USDA's percentage over 100", () => {
    expect(code(1)).toMatchObject({ description: "CHEESE,BAKED", nutrientNumber: 301, nutrientName: "Calcium, Ca", factor: 1, foodGroupCode: 1 });
    expect(rows.filter((r) => r.factor !== null).every((r) => r.factor! >= 0 && r.factor! <= 1)).toBe(true);
    expect(rows.some((r) => r.factor === 0.65)).toBe(true);
    expect(rows.filter((r) => r.retentionCode === 3006).map((r) => r.nutrientNumber)).toContain(401);
  });

  test("the 24 rows of code 5005 whose published cell holds no number keep a null factor, never an invented one", () => {
    const blank = rows.filter((r) => r.factor === null);
    expect(blank).toHaveLength(24);
    expect(new Set(blank.map((r) => r.retentionCode))).toEqual(new Set([5005]));
    expect(rows.filter((r) => r.retentionCode === 5005 && r.factor !== null).map((r) => [r.nutrientNumber, r.factor])).toEqual([[421, 1], [221, 0.35]]);
  });

  test.each([
    [3006, "VEG,GREENS", ["boiled"], true],
    [3455, "VEG,ROOTS,ETC", ["boiled"], false],
    [3751, "TOMATOES", ["boiled", "baked"], null],
    [154, "FRUITS", [], null],
    [105, "EGGS", ["boiled"], null],
    [433, "RICE,WHITE/BROWN", ["sauteed", "simmered"], null],
    [1456, "BACON", ["broiled", "fried"], null],
    [506, "LEGUMES,CKD 15/20MIN", ["boiled", "fried"], null],
    [503, "LEGUMES,CKD 15/20MIN", ["boiled", "baked"], false],
    [3316, "POTATOES", ["boiled"], null],
    [3019, "VEG,GREENS", ["boiled"], false],
    [3380, "POTATOES", ["fried"], null],
    [2605, "FINFISH(FROZEN)", ["reheated"], null],
    [2151, "MILK", ["reheated"], null],
    [306, "FLOUR/MEAL", ["toasted"], null],
    [302, "FLOUR/MEAL", ["boiled", "steamed"], null],
    [107, "EGGS", ["poached"], null],
    [103, "EGGS", ["fried"], null],
    [5003, "ALC BEV", [], null],
    [5001, "ALC BEV", [], null],
    [5004, "ALC BEV", ["baked", "simmered"], null],
    [601, "BEEF", ["roasted"], null],
    [651, "BEEF,ROAST", ["braised"], false],
    [654, "BEEF,ROAST", ["simmered"], true],
    [701, "BEEF,SLICES", ["simmered"], false],
    [602, "BEEF", ["broiled"], null],
    [603, "BEEF,GROUND", ["broiled"], null],
    [3701, "SWEETPOTATOES", ["baked"], null],
    [3702, "SWEETPOTATOES", ["baked"], null],
    [2055, "VEAL,SLICES", ["simmered"], false],
    [1951, "VEAL", ["broiled"], null],
    [1351, "PORK,FRESH,CHOPS", ["simmered"], false],
    [1551, "PORK,CURED,SLICES", ["simmered"], false],
    [1182, "ORGAN MEATS(NOTLIVER)", ["simmered"], false],
    [1181, "ORGAN MEATS(NOTLIVER)", ["fried"], null],
    [2702, "SHELLFISH,W/SHELL", ["steamed"], null],
    [155, "FRUITS,FRESH(NOT CITRUS)", ["stewed"], null],
    [255, "FRUITS(DRIED)", ["stewed"], null],
    [158, "FRUITS", [], null],
    [270, "FRUITS,CITRUS", [], null],
    [5, "CHEESE", [], true],
    [384, "PASTA", ["boiled"], true],
    [431, "RICE,WHITE/BROWN", ["boiled"], false],
    [351, "OATMEAL,INST", ["boiled"], null],
    [358, "CEREAL,REG/QUICK", ["boiled"], null],
    [2907, "SEAFOOD,FROG,TURTLE", ["braised"], false],
    [2902, "SEAFOOD,FROG,TURTLE", [], true],
    [3789, "VEG,OTHER", ["boiled"], false],
    [3015, "VEG,GREENS", ["fried"], null],
    [2554, "FINFISH", ["reheated"], null],
    [2301, "FINFISH,<5%FAT", ["baked"], false],
    [2452, "FINFISH,>5%FAT", ["baked"], true],
    [1654, "SAUSAGE,RTE,FRANKS,ETC", [], false],
    [1709, "SAUSAGE,RAW,PORK,OTHER", ["sauteed"], null],
    [1712, "SAUSAGE", ["reheated"], null],
    [1522, "HAM/PICNIC,CURED", ["simmered"], true],
    [2204, "NUTS", ["boiled"], true],
  ])("code %i is family %s cooked %j with liquid kept %s", (n, family, prepMethods, liquidKept) => {
    expect(code(n)).toMatchObject({ family, prepMethods, liquidKept });
  });
});

describe("retentionFamilyOf", () => {
  const family = (category: string, description: string, fatPer100g: number | null = null) => retentionFamilyOf(category, description, { fatPer100g });

  test.each([
    ["vegetable", "Kale, raw", "VEG,GREENS"],
    ["vegetable", "Spinach, frozen, chopped or leaf, unprepared (Includes foods for USDA's Food Distribution Program)", "VEG,GREENS"],
    ["vegetable", "Cabbage, chinese (pak-choi), raw", "VEG,GREENS"],
    ["vegetable", "Beet greens, raw", "VEG,GREENS"],
    ["vegetable", "Carrots, raw", "VEG,ROOTS,ETC"],
    ["vegetable", "Beets, raw", "VEG,ROOTS,ETC"],
    ["vegetable", "Onions, raw", "VEG,ROOTS,ETC"],
    ["vegetable", "Broccoli, raw", "VEG,OTHER"],
    ["vegetable", "Pumpkin, canned, without salt", "VEG,OTHER"],
    ["vegetable", "Potatoes, flesh and skin, raw", "POTATOES"],
    ["vegetable", "Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program)", "SWEETPOTATOES"],
    ["vegetable", "Yam, raw", "SWEETPOTATOES"],
    ["vegetable", "Tomatoes, red, ripe, raw, year round average", "TOMATOES"],
    ["vegetable", "Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program)", "TOMATOES"],
    ["fruit", "Oranges, raw, all commercial varieties", "FRUITS,CITRUS"],
    ["fruit", "Apples, raw, granny smith, with skin (Includes foods for USDA's Food Distribution Program)", "FRUITS,FRESH(NOT CITRUS)"],
    ["fruit", "Apricots, dried, sulfured, uncooked", "FRUITS(DRIED)"],
    ["fruit", "Raisins, seedless", "FRUITS(DRIED)"],
    ["legume", "Lentils, raw", "LEGUMES,CKD 15/20MIN"],
    ["legume", "Peas, split, mature seeds, raw", "LEGUMES,CKD 15/20MIN"],
    ["legume", "Chickpeas (garbanzo beans, bengal gram), mature seeds, raw", "LEGUMES,CKD 2/2.5HRS"],
    ["legume", "Soybeans, mature seeds, raw", "LEGUMES,CKD 2/2.5HRS"],
    ["legume", "Beans, black, mature seeds, raw", "LEGUMES,CKD 45/75MIN"],
    ["legume", "Peanuts, all types, raw", "NUTS"],
    ["legume", "Tofu, firm, prepared with calcium sulfate and magnesium chloride (nigari)", null],
    ["legume", "Soy sauce made from soy (tamari)", null],
    ["meat", "Beef, ground, 85% lean meat / 15% fat, raw", "BEEF,GROUND"],
    ["meat", "Beef, chuck, arm pot roast, separable lean only, trimmed to 0\" fat, choice, raw", "BEEF,ROAST"],
    ["meat", "Beef, top sirloin, steak, separable lean only, trimmed to 0\" fat, choice, raw", "BEEF,SLICES"],
    ["meat", "Beef, tenderloin, separable lean only, trimmed to 0\" fat, choice, raw", "BEEF"],
    ["meat", "Beef, variety meats and by-products, liver, raw", "LIVER"],
    ["meat", "Beef, variety meats and by-products, kidneys, raw", "ORGAN MEATS(NOTLIVER)"],
    ["meat", "Pork, cured, bacon, unprepared", "BACON"],
    ["meat", "Bacon, pre-sliced, reduced/low sodium, unprepared", "BACON"],
    ["meat", "Pork, cured, ham, whole, separable lean and fat, unheated", "HAM/PICNIC,CURED"],
    ["meat", "Pork, cured, salt pork, raw", "PORK,CURED"],
    ["meat", "Pork, fresh, loin, center loin (chops), bone-in, separable lean and fat, raw", "PORK,FRESH,CHOPS"],
    ["meat", "Pork, fresh, ground, raw", "PORK,FRESH,GROUND"],
    ["meat", "Pork, fresh, leg (ham), whole, separable lean and fat, raw", "PORK,FRESH"],
    ["meat", "Lamb, ground, raw", "LAMB,GROUND"],
    ["meat", "Lamb, domestic, leg, whole (shank and sirloin), separable lean only, trimmed to 1/4\" fat, choice, raw", "LAMB"],
    ["meat", "Veal, leg (top round), separable lean only, raw", "VEAL"],
    ["meat", "Veal, shoulder, blade, roast, separable lean only, raw", "VEAL,ROAST"],
    ["meat", "Chicken, broilers or fryers, breast, meat only, raw", "CHICKEN"],
    ["meat", "Chicken, liver, all classes, raw", "LIVER"],
    ["meat", "Turkey, whole, meat and skin, raw", "TURKEY"],
    ["meat", "Duck, domesticated, meat only, raw", "CHICKEN"],
    ["meat", "Game meat, bison, ground, raw", "LAMB"],
    ["meat", "Sausage, Italian, pork, raw", "SAUSAGE,RAW,PORK,OTHER"],
    ["meat", "Frankfurter, beef, unheated", "SAUSAGE,RTE,FRANKS,ETC"],
    ["meat", "Bologna, beef", "SAUSAGE,RTE,FRANKS,ETC"],
    ["meat", "Sausage, pork, chorizo, link or ground, cooked, pan-fried", "SAUSAGE,RTE,FRANKS,ETC"],
    ["meat", "Ostrich, inside leg, raw", null],
    ["fish", "Fish, salmon, Atlantic, farmed, raw", "FINFISH,>5%FAT", 13],
    ["fish", "Fish, cod, Atlantic, raw", "FINFISH,<5%FAT", 0.7],
    ["fish", "Fish, haddock, raw", "FINFISH"],
    ["fish", "Crustaceans, shrimp, mixed species, raw", "SHELLFISH,WO/SHELL"],
    ["fish", "Mollusks, oyster, eastern, wild, raw", "SHELLFISH,WO/SHELL"],
    ["fish", "Frog legs, raw", "SEAFOOD,FROG,TURTLE"],
    ["dairy", "Cheese, cheddar", "CHEESE"],
    ["dairy", "Egg, whole, raw, fresh", "EGGS"],
    ["egg", "Egg, whole, raw, fresh", "EGGS"],
    ["dairy", "Milk, whole, 3.25% milkfat, with added vitamin D", "MILK"],
    ["dairy", "Yogurt, plain, low fat", "MILK"],
    ["dairy", "Butter, salted", null],
    ["cereal", "Cereals, oats, instant, fortified, plain, dry", "OATMEAL,INST"],
    ["cereal", "Cereals, oats, regular and quick, not fortified, dry", "OATMEAL,REG/QUICK"],
    ["cereal", "Cereals, CREAM OF WHEAT, instant, dry", "CEREAL,INST"],
    ["cereal", "Cereals ready-to-eat, GENERAL MILLS, CHEERIOS", "CEREAL,REG/QUICK"],
    ["grain", "Rice, brown, long-grain, raw", "RICE,WHITE/BROWN"],
    ["grain", "Pasta, dry, enriched", "PASTA"],
    ["grain", "Rice noodles, cooked", "PASTA"],
    ["grain", "Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)", "FLOUR/MEAL"],
    ["grain", "Rice flour, brown", "FLOUR/MEAL"],
    ["grain", "Cornmeal, degermed, enriched, yellow", "FLOUR/MEAL"],
    ["grain", "Quinoa, uncooked", "RICE,WHITE/BROWN"],
    ["grain", "Barley, hulled", "RICE,WHITE/BROWN"],
    ["grain", "Oats (Includes foods for USDA's Food Distribution Program)", "OATMEAL,REG/QUICK"],
    ["grain", "Tapioca, pearl, dry", null],
    ["nut", "Nuts, almonds", "NUTS"],
    ["nut", "Seeds, sunflower seed kernels, dried", "NUTS"],
    ["drink", "Alcoholic beverage, wine, table, red", "ALC BEV"],
    ["drink", "Alcoholic beverage, beer, regular, all", "ALC BEV"],
    ["drink", "Beverages, coffee, brewed, prepared with tap water", null],
    ["drink", "Beverages, carbonated, ginger ale", null],
    ["drink", "Beverages, Malt liquor beverage, non-alcoholic", null],
    ["oil", "Oil, olive, salad or cooking", null],
    ["spice", "Spices, turmeric, ground", null],
    ["sweet", "Sugars, granulated", null],
  ])("%s · %s cooks like %s", (category: string, description: string, expected: string | null, fat: number | null = null) => {
    expect(family(category, description, fat)).toBe(expected);
  });

  test("every family it can name is one the table has", () => {
    const named = [
      family("vegetable", "Kale, raw"),
      family("meat", "Pork, cured, salt pork, raw"),
      family("fish", "Fish, haddock, raw"),
      family("grain", "Pasta, dry, enriched"),
    ];
    for (const f of named) expect(RETENTION_FAMILIES).toContain(f);
  });

  test("the ten cooking methods the coverage report counts", () => {
    expect(COOKING_METHODS).toEqual(["boiled", "baked", "fried", "roasted", "broiled", "simmered", "sauteed", "steamed", "stewed", "braised"]);
  });
});
