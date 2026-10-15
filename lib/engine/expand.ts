// Step 1: each ingredient's compounds, scaled from per-100 g to the grams the recipe uses.
import type { AmountFact, Contribution, RecipeInput } from "./types.ts";

/**
 * Scale every amount fact for the recipe's ingredients to the grams used.
 * @param recipe [RecipeInput] the recipe
 * @param amounts [AmountFact[]] ingredient_compound facts; those for other ingredients are ignored
 * @return [Contribution[]] one per recipe ingredient and compound, before prep
 */
export function expand(recipe: RecipeInput, amounts: AmountFact[]): Contribution[] {
  return recipe.ingredients.flatMap((ri) =>
    amounts
      .filter((a) => a.ingredientSlug === ri.ingredientSlug)
      .map((a) => {
        const scale = ri.grams / 100;
        const hasRange = a.amountLow !== null && a.amountHigh !== null;
        return {
          recipeIngredientId: ri.id,
          ingredientSlug: ri.ingredientSlug,
          compoundSlug: a.compoundSlug,
          amount: a.amountPer100g === null ? null : a.amountPer100g * scale,
          unit: a.unit,
          range: hasRange ? [a.amountLow! * scale, a.amountHigh! * scale] : null,
          prep: null,
        };
      }),
  );
}
