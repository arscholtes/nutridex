// Step 2: how the way an ingredient is prepared changes what it delivers.
import type { Contribution, PrepEffectFact, RecipeIngredientInput, RecipeInput, RecipeStepInput } from "./types.ts";

/**
 * The prep methods the engine knows: the plan's six, then the cooking methods published nutrient
 * retention tables use. A method outside this list is a typo, not a new one.
 */
export const PREP_METHODS = [
  "raw", "juiced", "blended", "boiled", "roasted", "fermented",
  "baked", "fried", "broiled", "simmered", "sauteed", "steamed", "stewed", "braised",
] as const;

/** The prep method a source's per-100 g amount already describes. */
const AS_RECORDED = "raw";

/**
 * The prep methods an ingredient goes through, in order: its own (unless raw), then each step that
 * uses it and names a method, by step position. Each is applied in turn, so steps stack.
 * @param ingredient [RecipeIngredientInput] the recipe ingredient
 * @param steps [RecipeStepInput[]] the recipe's steps, in any order
 * @return [string[]] the methods in the order they happen; empty when nothing changes the food
 */
export function prepSequence(ingredient: RecipeIngredientInput, steps: RecipeStepInput[]): string[] {
  const fromSteps = steps
    .filter((s) => s.prepMethod !== null && s.recipeIngredientIds.includes(ingredient.id))
    .sort((a, b) => a.position - b.position)
    .map((s) => s.prepMethod!);
  return [ingredient.prepMethod, ...fromSteps].filter((m) => m !== AS_RECORDED);
}

/**
 * Apply each contribution's prep methods in order: every sourced retention factor multiplies, and
 * each method leaves a prep note either way, so an unknown retention shows as unknown, not 100%.
 * @param recipe [RecipeInput] the recipe
 * @param contributions [Contribution[]] expanded contributions
 * @param prepEffects [PrepEffectFact[]] prep_effect facts
 * @return [Contribution[]] the contributions after prep
 * @throws when the recipe or a prep fact names a method outside PREP_METHODS
 */
export function applyPrep(recipe: RecipeInput, contributions: Contribution[], prepEffects: PrepEffectFact[]): Contribution[] {
  for (const p of prepEffects) knownMethod(p.prepMethod, `prep fact on ${p.compoundSlug}`);
  const sequences = new Map(
    recipe.ingredients.map((ri) => [ri.id, prepSequence(ri, recipe.steps).map((m) => knownMethod(m, ri.ingredientSlug))]),
  );
  return contributions.map((c) =>
    sequences.get(c.recipeIngredientId)!.reduce((done, method) => {
      const fact = prepEffects.find((p) => p.compoundSlug === c.compoundSlug && p.prepMethod === method);
      const factor = fact?.retentionFactor ?? null;
      return {
        ...done,
        amount: factor === null || done.amount === null ? done.amount : done.amount * factor,
        range: factor === null || done.range === null ? done.range : [done.range[0] * factor, done.range[1] * factor],
        prep: [
          ...done.prep,
          {
            ingredientSlug: c.ingredientSlug,
            compoundSlug: c.compoundSlug,
            method,
            retentionFactor: factor,
            direction: fact?.direction ?? null,
            note: fact?.note ?? null,
          },
        ],
      };
    }, c),
  );
}

function knownMethod(method: string, where: string): string {
  if (!(PREP_METHODS as readonly string[]).includes(method)) {
    throw new Error(`${where}: prep method "${method}" is not one of ${PREP_METHODS.join(", ")}`);
  }
  return method;
}
