// Turns USDA's food records into Dex foods. Pure: no network, no database.

/** Where pulled USDA records are held, so a re-run costs no calls. */
export const USDA_CACHE = ".usda-cache";

/** Every USDA food pinned as a Dex food, written by `npm run generate:foods`. */
export const USDA_FOOD_PINS = "data/seed/usda-foods.json";

export type UsdaFoodPin = { slug: string; name: string; category: string; usdaFdcId: number; usdaDescription: string; imageUrl: string };

const CATEGORY_OF: Record<string, string> = {
  "American Indian/Alaska Native Foods": "traditional",
  "Baby Foods": "baby food",
  "Baked Products": "baked",
  "Beef Products": "meat",
  Beverages: "drink",
  "Breakfast Cereals": "cereal",
  "Cereal Grains and Pasta": "grain",
  "Dairy and Egg Products": "dairy",
  "Fast Foods": "fast food",
  "Fats and Oils": "oil",
  "Finfish and Shellfish Products": "fish",
  "Fruits and Fruit Juices": "fruit",
  "Lamb, Veal, and Game Products": "meat",
  "Legumes and Legume Products": "legume",
  "Meals, Entrees, and Side Dishes": "meal",
  "Nut and Seed Products": "nut",
  "Pork Products": "meat",
  "Poultry Products": "meat",
  "Restaurant Foods": "restaurant",
  "Sausages and Luncheon Meats": "meat",
  Snacks: "snack",
  "Soups, Sauces, and Gravies": "soup",
  "Spices and Herbs": "spice",
  Sweets: "sweet",
  "Vegetables and Vegetable Products": "vegetable",
};

/** The Dex's food categories, each with a stand-in creature until its foods are drawn. */
export const FOOD_CATEGORIES: string[] = [...new Set(Object.values(CATEGORY_OF))].sort();

/**
 * @param usdaCategory [string] USDA's food group
 * @return [string] the Dex's short word for it
 * @throws when USDA names a group this map was not written against
 */
export function foodCategory(usdaCategory: string): string {
  const category = CATEGORY_OF[usdaCategory];
  if (!category) throw new Error(`USDA food group "${usdaCategory}" has no Dex category`);
  return category;
}

/**
 * @param description [string] USDA's description of the food
 * @return [string] the name it goes by in the Dex
 */
export function foodName(description: string): string {
  return description.replace(/\s*\(Includes foods for USDA's Food Distribution Program\)/, "").replace(/, raw$/, "");
}

/**
 * @param name [string] the food's name
 * @return [string] its slug
 */
export function foodSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
