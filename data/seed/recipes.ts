// The plan's first recipe, the juice. Grams are USDA's own portion weights for each food's record.

export type SeedRecipe = {
  slug: string;
  name: string;
  servings: number;
  ingredients: { ingredientSlug: string; grams: number; prepMethod: string; portion: string }[];
};

export const RECIPES: SeedRecipe[] = [
  {
    slug: "juice",
    name: "Juice",
    servings: 1,
    ingredients: [
      { ingredientSlug: "granny-smith-apple", grams: 167, prepMethod: "juiced", portion: "1 medium" },
      { ingredientSlug: "carrot", grams: 122, prepMethod: "juiced", portion: "2 medium" },
      { ingredientSlug: "beet", grams: 82, prepMethod: "juiced", portion: "1 beet, 2 in across" },
      { ingredientSlug: "kale", grams: 42, prepMethod: "juiced", portion: "2 cups" },
    ],
  },
];
