// The recipe pipeline: expand → prep → aggregate → modifiers → cautions → effects → goal scores,
// then the microbiome feed check.
import { aggregate } from "./aggregate.ts";
import { collectCautions } from "./cautions.ts";
import { rollUpEffects } from "./effects.ts";
import { expand } from "./expand.ts";
import { scoreGoals } from "./goals.ts";
import { feedCheck } from "./microbes.ts";
import { checkModifiers } from "./modifiers.ts";
import { applyPrep } from "./prep.ts";
import type { EngineSettings } from "./settings.ts";
import type { Facts, RecipeInput, RecipeProfile } from "./types.ts";

/**
 * Compute a recipe's profile from its facts. Never stored: rerun on every change.
 * @param recipe [RecipeInput] the recipe
 * @param facts [Facts] every fact about its ingredients and their compounds
 * @param settings [EngineSettings] tunable thresholds and weights
 * @param goals [string[]] effect slugs to score
 * @return [RecipeProfile] totals, prep notes, every flag and the feed check
 */
export function recipeProfile(recipe: RecipeInput, facts: Facts, settings: EngineSettings, goals: string[]): RecipeProfile {
  const contributions = applyPrep(recipe, expand(recipe, facts.amounts), facts.prepEffects, facts.retention);
  const perServing = aggregate(recipe, contributions);
  const ingredientSlugs = recipe.ingredients.map((ri) => ri.ingredientSlug);
  return {
    perServing,
    prep: contributions.flatMap((c) => c.prep),
    absorption: checkModifiers(perServing, ingredientSlugs, facts.modifiers, settings),
    effects: rollUpEffects(perServing, facts.compoundEffects),
    cautions: collectCautions(perServing, ingredientSlugs, facts.cautions, facts.upperLimits),
    goalScores: scoreGoals(perServing, facts.compoundEffects, goals, settings),
    feeds: feedCheck(perServing, facts.microbeSubstrates, facts.microbeMetabolites, settings.gradeWeights),
  };
}
