// The build plan's seed compounds and the ingredients it names as their main sources, plus total
// fat, which the engine's "dietary fat present" condition reads, and total dietary fiber, which
// gives juicing's fiber loss an amount, and the nutrient panel's compounds (PANEL in
// lib/usda/nutrients.ts), which USDA fills for every food.
// Identity only: amounts come from USDA, and properties, modifiers and cautions need sources
// before they can be stored, so none are typed in here.

export type SeedCompound = {
  slug: string;
  name: string;
  class: string;
  /** Ingredient slugs the plan names as this compound's main seed sources. */
  mainIngredients: string[];
  /** The ChEBI entity, when the compound is one (checked against ChEBI release 256). */
  chebiId?: number;
};

export const COMPOUNDS: SeedCompound[] = [
  {
    slug: "beta-carotene",
    name: "Beta-carotene",
    class: "carotenoid",
    mainIngredients: [
      "carrot",
      "canned-pumpkin-puree",
      "sweet-potato",
      "butternut-squash",
      "frozen-spinach",
      "kale",
      "cantaloupe",
    ],
    chebiId: 17579,
  },
  { slug: "alpha-carotene", name: "Alpha-carotene", class: "carotenoid", mainIngredients: ["carrot", "canned-pumpkin-puree"], chebiId: 28425 },
  { slug: "lycopene", name: "Lycopene", class: "carotenoid", mainIngredients: ["tomato-paste", "watermelon"], chebiId: 15948 },
  // USDA measures lutein and zeaxanthin together, so this is two ChEBI entities and has no one id.
  {
    slug: "lutein-zeaxanthin",
    name: "Lutein / zeaxanthin",
    class: "carotenoid",
    mainIngredients: ["kale", "frozen-spinach", "egg"],
  },
  { slug: "nitrate", name: "Nitrate", class: "nitrate", mainIngredients: ["beet", "frozen-spinach", "kale"] },
  { slug: "betanin", name: "Betanin", class: "betalain", mainIngredients: ["beet"] },
  { slug: "curcumin", name: "Curcumin", class: "polyphenol", mainIngredients: ["turmeric"] },
  { slug: "piperine", name: "Piperine", class: "alkaloid", mainIngredients: ["black-pepper"] },
  { slug: "vitamin-k1", name: "Vitamin K1", class: "vitamin", mainIngredients: ["kale", "frozen-spinach"] },
  { slug: "vitamin-c", name: "Vitamin C", class: "vitamin", mainIngredients: ["kale", "granny-smith-apple"] },
  { slug: "pectin", name: "Pectin", class: "fiber", mainIngredients: ["granny-smith-apple"] },
  { slug: "oxalate", name: "Oxalate", class: "antinutrient", mainIngredients: ["beet", "frozen-spinach", "kale"] },
  { slug: "total-fat", name: "Total fat", class: "macronutrient", mainIngredients: [] },
  { slug: "dietary-fiber", name: "Dietary fiber", class: "fiber", mainIngredients: [] },
  { slug: "energy", name: "Energy", class: "energy", mainIngredients: [] },
  { slug: "protein", name: "Protein", class: "macronutrient", mainIngredients: [] },
  { slug: "saturated-fat", name: "Saturated fat", class: "macronutrient", mainIngredients: [] },
  { slug: "carbohydrate", name: "Carbohydrate", class: "macronutrient", mainIngredients: [] },
  { slug: "total-sugars", name: "Total sugars", class: "macronutrient", mainIngredients: [] },
  { slug: "vitamin-a", name: "Vitamin A (RAE)", class: "vitamin", mainIngredients: [] },
  { slug: "retinol", name: "Retinol", class: "vitamin", mainIngredients: [] },
  { slug: "vitamin-d", name: "Vitamin D", class: "vitamin", mainIngredients: [] },
  { slug: "vitamin-e", name: "Vitamin E", class: "vitamin", mainIngredients: [] },
  { slug: "thiamin", name: "Thiamin (B1)", class: "vitamin", mainIngredients: [] },
  { slug: "riboflavin", name: "Riboflavin (B2)", class: "vitamin", mainIngredients: [] },
  { slug: "niacin", name: "Niacin (B3)", class: "vitamin", mainIngredients: [] },
  { slug: "pantothenic-acid", name: "Pantothenic acid (B5)", class: "vitamin", mainIngredients: [] },
  { slug: "vitamin-b6", name: "Vitamin B6", class: "vitamin", mainIngredients: [] },
  { slug: "folate", name: "Folate (DFE)", class: "vitamin", mainIngredients: [] },
  { slug: "vitamin-b12", name: "Vitamin B12", class: "vitamin", mainIngredients: [] },
  { slug: "choline", name: "Choline", class: "nutrient", mainIngredients: [] },
  { slug: "calcium", name: "Calcium", class: "mineral", mainIngredients: [] },
  { slug: "iron", name: "Iron", class: "mineral", mainIngredients: [] },
  { slug: "magnesium", name: "Magnesium", class: "mineral", mainIngredients: [] },
  { slug: "phosphorus", name: "Phosphorus", class: "mineral", mainIngredients: [] },
  { slug: "potassium", name: "Potassium", class: "mineral", mainIngredients: [] },
  { slug: "sodium", name: "Sodium", class: "mineral", mainIngredients: [] },
  { slug: "zinc", name: "Zinc", class: "mineral", mainIngredients: [] },
  { slug: "copper", name: "Copper", class: "mineral", mainIngredients: [] },
  { slug: "manganese", name: "Manganese", class: "mineral", mainIngredients: [] },
  { slug: "selenium", name: "Selenium", class: "mineral", mainIngredients: [] },
];
