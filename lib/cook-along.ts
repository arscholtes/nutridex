// Cooking along with a recipe: the stages someone steps through, and what having cooked it records.
// Pure: it reads the grid and the engine's profile of the same recipe, and judges nothing itself.
import type { PrepNote } from "epistasis";
import type { CatchItem, Form } from "./db/encounters.ts";
import type { RecipePage } from "./db/recipes.ts";

export type CookFood = { slug: string; grams: number; prepMethod: string };

export type CookStage = {
  /** The step's place in the recipe; null for a stage that prepares one ingredient of a recipe with no steps. */
  step: number | null;
  /** The step's title; null where the stage is an ingredient's own preparation. */
  title: string | null;
  prepMethod: string | null;
  foods: CookFood[];
  /** What this stage does to a compound by a sourced amount, or by one no source gives. */
  prep: PrepNote[];
};

type Cookable = { slug: string; grid: RecipePage["grid"]; profile: { prep: PrepNote[] }; stepTitles: RecipePage["stepTitles"] };

// The methods that put a food over heat. Blending and fermenting are neither raw, juiced nor cooked.
const HEATED = new Set(["boiled", "roasted", "baked", "fried", "broiled", "simmered", "sauteed", "steamed", "stewed", "braised", "reheated", "toasted", "poached"]);

/**
 * @param prepMethod [string] how a recipe prepares a food
 * @return [Form | null] the form that is a catch of it, or null when the method is none of the three
 */
export function formOf(prepMethod: string): Form | null {
  if (prepMethod === "raw" || prepMethod === "juiced") return prepMethod;
  return HEATED.has(prepMethod) ? "cooked" : null;
}

/**
 * The stages of cooking a recipe, in order. Every prep note the engine gave lands on exactly one stage.
 * @param page [Cookable] the recipe as its page shows it
 * @return [CookStage[]] one for each step, or one for each ingredient when the recipe has no steps
 */
export function cookStages(page: Cookable): CookStage[] {
  const { rows, steps } = page.grid;
  const food = (r: (typeof rows)[number]): CookFood => ({ slug: r.ingredientSlug, grams: r.grams, prepMethod: r.prepMethod });
  const notes = (slug: string, method: string | null) => page.profile.prep.filter((p) => p.ingredientSlug === slug && p.method === method);
  if (steps.length === 0) {
    return rows.map((r) => ({ step: null, title: null, prepMethod: r.prepMethod, foods: [food(r)], prep: notes(r.ingredientSlug, r.prepMethod) }));
  }
  const prepared = new Set<string>();
  return steps.map((s) => {
    const used = s.cells.flatMap((c) => rows.slice(c.rowStart, c.rowStart + c.rowSpan));
    const prep = used.flatMap((r) => {
      const own = prepared.has(r.recipeIngredientId) || r.prepMethod === s.prepMethod ? [] : notes(r.ingredientSlug, r.prepMethod);
      prepared.add(r.recipeIngredientId);
      return [...own, ...notes(r.ingredientSlug, s.prepMethod)];
    });
    return { step: s.position, title: page.stepTitles[s.position], prepMethod: s.prepMethod, foods: used.map(food), prep };
  });
}

/**
 * What having cooked a recipe records: a catch of each food in it, in that recipe.
 * A food under heat in any step counts as cooked; otherwise its own preparation says its form.
 * @param page [Cookable] the recipe
 * @param at [string] when it was cooked, as an ISO date
 * @return [CatchItem[]] one for each food, in the grid's order
 */
export function cookedCatches(page: Cookable, at: string): CatchItem[] {
  const { rows, steps } = page.grid;
  const heated = new Set(steps.filter((s) => s.prepMethod !== null && HEATED.has(s.prepMethod)).flatMap((s) => s.cells.flatMap((c) => rows.slice(c.rowStart, c.rowStart + c.rowSpan).map((r) => r.ingredientSlug))));
  const seen = new Set<string>();
  return rows.flatMap((r) => {
    if (seen.has(r.ingredientSlug)) return [];
    seen.add(r.ingredientSlug);
    return [{ food: r.ingredientSlug, encounteredAt: at, form: heated.has(r.ingredientSlug) ? "cooked" : formOf(r.prepMethod), recipe: page.slug }];
  });
}
