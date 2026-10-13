// The build plan's seed ingredients, each pinned to one USDA FoodData Central food (SR Legacy).
// usdaDescription is USDA's own name for that food; the import refuses a food whose name differs.

export type SeedIngredient = {
  slug: string;
  name: string;
  category: string;
  usdaFdcId: number;
  usdaDescription: string;
};

export const INGREDIENTS: SeedIngredient[] = [
  { slug: "carrot", name: "Carrot", category: "vegetable", usdaFdcId: 170393, usdaDescription: "Carrots, raw" },
  { slug: "beet", name: "Beet", category: "vegetable", usdaFdcId: 169145, usdaDescription: "Beets, raw" },
  { slug: "kale", name: "Kale", category: "vegetable", usdaFdcId: 168421, usdaDescription: "Kale, raw" },
  {
    slug: "granny-smith-apple",
    name: "Granny Smith apple",
    category: "fruit",
    usdaFdcId: 168203,
    usdaDescription: "Apples, raw, granny smith, with skin (Includes foods for USDA's Food Distribution Program)",
  },
  {
    slug: "canned-pumpkin-puree",
    name: "Canned pumpkin purée",
    category: "vegetable",
    usdaFdcId: 168450,
    usdaDescription: "Pumpkin, canned, without salt",
  },
  {
    slug: "sweet-potato",
    name: "Sweet potato",
    category: "vegetable",
    usdaFdcId: 168482,
    usdaDescription: "Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program)",
  },
  {
    slug: "tomato-paste",
    name: "Tomato paste",
    category: "vegetable",
    usdaFdcId: 170459,
    usdaDescription:
      "Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program)",
  },
  {
    slug: "frozen-spinach",
    name: "Frozen spinach",
    category: "vegetable",
    usdaFdcId: 169287,
    usdaDescription:
      "Spinach, frozen, chopped or leaf, unprepared (Includes foods for USDA's Food Distribution Program)",
  },
  {
    slug: "butternut-squash",
    name: "Butternut squash",
    category: "vegetable",
    usdaFdcId: 169295,
    usdaDescription: "Squash, winter, butternut, raw",
  },
  { slug: "watermelon", name: "Watermelon", category: "fruit", usdaFdcId: 167765, usdaDescription: "Watermelon, raw" },
  { slug: "cantaloupe", name: "Cantaloupe", category: "fruit", usdaFdcId: 169092, usdaDescription: "Melons, cantaloupe, raw" },
  { slug: "egg", name: "Egg", category: "egg", usdaFdcId: 171287, usdaDescription: "Egg, whole, raw, fresh" },
  { slug: "olive-oil", name: "Olive oil", category: "oil", usdaFdcId: 171413, usdaDescription: "Oil, olive, salad or cooking" },
  { slug: "turmeric", name: "Turmeric", category: "spice", usdaFdcId: 172231, usdaDescription: "Spices, turmeric, ground" },
  { slug: "black-pepper", name: "Black pepper", category: "spice", usdaFdcId: 170931, usdaDescription: "Spices, pepper, black" },
];
