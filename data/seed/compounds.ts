// The build plan's seed compounds and the ingredients it names as their main sources.
// Identity only: amounts come from USDA, and properties, modifiers and cautions need sources
// before they can be stored, so none are typed in here.

export type SeedCompound = {
  slug: string;
  name: string;
  class: string;
  /** Ingredient slugs the plan names as this compound's main seed sources. */
  mainIngredients: string[];
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
  },
  { slug: "alpha-carotene", name: "Alpha-carotene", class: "carotenoid", mainIngredients: ["carrot", "canned-pumpkin-puree"] },
  { slug: "lycopene", name: "Lycopene", class: "carotenoid", mainIngredients: ["tomato-paste", "watermelon"] },
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
];
