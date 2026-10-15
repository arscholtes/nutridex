// Step 2: how the way an ingredient is prepared changes what it delivers.
import type { Contribution, PrepEffectFact, RecipeIngredientInput, RecipeInput, RecipeStepInput } from "./types.ts";

/** The prep method a source's per-100 g amount already describes. */
const AS_RECORDED = "raw";

/**
 * The prep method that applies to an ingredient: its own, overridden by the last step that uses it
 * and names a method.
 * @param ingredient [RecipeIngredientInput] the recipe ingredient
 * @param steps [RecipeStepInput[]] the recipe's steps, in any order
 * @return [string] the effective prep method
 */
export function effectivePrep(ingredient: RecipeIngredientInput, steps: RecipeStepInput[]): string {
  const last = steps
    .filter((s) => s.prepMethod !== null && s.recipeIngredientIds.includes(ingredient.id))
    .sort((a, b) => a.position - b.position)
    .at(-1);
  return last?.prepMethod ?? ingredient.prepMethod;
}

/**
 * Apply each contribution's effective prep: multiply by a sourced retention factor, and record
 * a prep note either way, so an unknown retention shows as unknown rather than as 100%.
 * @param recipe [RecipeInput] the recipe
 * @param contributions [Contribution[]] expanded contributions
 * @param prepEffects [PrepEffectFact[]] prep_effect facts
 * @return [Contribution[]] the contributions after prep
 */
export function applyPrep(recipe: RecipeInput, contributions: Contribution[], prepEffects: PrepEffectFact[]): Contribution[] {
  const methods = new Map(recipe.ingredients.map((ri) => [ri.id, effectivePrep(ri, recipe.steps)]));
  return contributions.map((c) => {
    const method = methods.get(c.recipeIngredientId)!;
    if (method === AS_RECORDED) return c;
    const fact = prepEffects.find((p) => p.compoundSlug === c.compoundSlug && p.prepMethod === method);
    const factor = fact?.retentionFactor ?? null;
    return {
      ...c,
      amount: factor === null || c.amount === null ? c.amount : c.amount * factor,
      range: factor === null || c.range === null ? c.range : [c.range[0] * factor, c.range[1] * factor],
      prep: {
        ingredientSlug: c.ingredientSlug,
        compoundSlug: c.compoundSlug,
        method,
        retentionFactor: factor,
        direction: fact?.direction ?? null,
        note: fact?.note ?? null,
      },
    };
  });
}
