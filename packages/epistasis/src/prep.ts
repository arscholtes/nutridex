// Step 2: how the way an ingredient is prepared changes what it delivers.
import type { Contribution, PrepDirection, PrepEffectFact, RecipeIngredientInput, RecipeInput, RecipeStepInput, RetentionFact } from "./types.ts";

/**
 * The prep methods the engine knows: the plan's six, then the cooking methods published nutrient
 * retention tables use. A method outside this list is a typo, not a new one.
 */
export const PREP_METHODS = [
  "raw", "juiced", "blended", "boiled", "roasted", "fermented",
  "baked", "fried", "broiled", "simmered", "sauteed", "steamed", "stewed", "braised",
  "reheated", "toasted", "poached",
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
 * Whether a retention fact's family covers a food's: the same family, or a comma-prefix of it, so a
 * `BEEF` fact applies to `BEEF,GROUND`.
 * @param factFamily [string] the fact's family
 * @param foodFamily [string] the food's family
 * @return [boolean] true when the fact applies
 */
export function retentionFamilyApplies(factFamily: string, foodFamily: string): boolean {
  return foodFamily === factFamily || foodFamily.startsWith(`${factFamily},`);
}

/** Liquid discarded is the conservative reading, then a row that does not say, then liquid kept. */
const LIQUID_RANK = { false: 0, null: 1, true: 2 } as const;

/**
 * The retention fact for a food family, method and compound: the most specific family, then liquid
 * discarded over kept, then the lowest retention among rows still alike.
 * @return [RetentionFact | null] null when no fact covers the family and method
 */
function bestRetention(retention: RetentionFact[], family: string, method: string, compoundSlug: string): RetentionFact | null {
  return (
    retention
      .filter((r) => r.compoundSlug === compoundSlug && r.prepMethod === method && retentionFamilyApplies(r.family, family))
      .sort((a, b) => b.family.length - a.family.length || LIQUID_RANK[`${a.liquidKept}`] - LIQUID_RANK[`${b.liquidKept}`] || a.factor - b.factor)[0] ?? null
  );
}

function directionOf(factor: number): PrepDirection {
  return factor < 1 ? "decreases" : factor > 1 ? "increases" : "unchanged";
}

/**
 * Apply each contribution's prep methods in order: every sourced retention factor multiplies, and
 * each method leaves a prep note either way, so an unknown retention shows as unknown, not 100%.
 * A retention-table fact for the ingredient's family wins over a generic prep_effect fact.
 * @param recipe [RecipeInput] the recipe
 * @param contributions [Contribution[]] expanded contributions
 * @param prepEffects [PrepEffectFact[]] prep_effect facts
 * @param retention [RetentionFact[]] retention-table facts for the families in play
 * @return [Contribution[]] the contributions after prep
 * @throws when the recipe or a fact names a method outside PREP_METHODS
 */
export function applyPrep(recipe: RecipeInput, contributions: Contribution[], prepEffects: PrepEffectFact[], retention: RetentionFact[] = []): Contribution[] {
  for (const p of prepEffects) knownMethod(p.prepMethod, `prep fact on ${p.compoundSlug}`);
  for (const r of retention) knownMethod(r.prepMethod, `retention fact on ${r.family} · ${r.compoundSlug}`);
  const sequences = new Map(
    recipe.ingredients.map((ri) => [ri.id, prepSequence(ri, recipe.steps).map((m) => knownMethod(m, ri.ingredientSlug))]),
  );
  const families = new Map(recipe.ingredients.map((ri) => [ri.id, ri.retentionFamily]));
  return contributions.map((c) =>
    sequences.get(c.recipeIngredientId)!.reduce((done, method) => {
      const family = families.get(c.recipeIngredientId) ?? null;
      const fromTable = family === null ? null : bestRetention(retention, family, method, c.compoundSlug);
      const fact = fromTable ? null : (prepEffects.find((p) => p.compoundSlug === c.compoundSlug && p.prepMethod === method) ?? null);
      const factor = fromTable ? fromTable.factor : (fact?.retentionFactor ?? null);
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
            direction: fromTable ? directionOf(fromTable.factor) : (fact?.direction ?? null),
            note: fact?.note ?? null,
            source: fromTable ? "retention-table" : fact ? "prep-effect" : null,
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
