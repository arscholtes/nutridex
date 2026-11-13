// The recipe grid: ingredients as rows, a column per step, each step's cell spanning the rows it uses.
// Layout only. Every judgment about a recipe comes from the engine's profile of the same RecipeInput,
// which is what lets the grid and the profile be drawn from one piece of data.
import type { RecipeInput } from "epistasis";

export type GridRow = { recipeIngredientId: string; ingredientSlug: string; grams: number; prepMethod: string };
/** One block of a step's column. A step whose ingredients cannot sit together comes in numbered parts. */
export type GridCell = { rowStart: number; rowSpan: number; part: number; parts: number; whole: boolean };
export type GridStep = { position: number; prepMethod: string | null; cells: GridCell[] };
export type RecipeGrid = { rows: GridRow[]; steps: GridStep[] };

// Above this many ingredients the exact search stops being cheap; the first-use order takes over.
const SEARCH_LIMIT = 8;

/**
 * Lay a recipe out as its spanning grid.
 * @param recipe [RecipeInput] the recipe as the engine reads it
 * @return [RecipeGrid] rows in an order that keeps each step's ingredients together where any order can
 */
export function recipeGrid(recipe: RecipeInput): RecipeGrid {
  const steps = [...recipe.steps].sort((a, b) => a.position - b.position);
  const order = rowOrder(recipe.ingredients.map((i) => i.id), steps);
  const byId = new Map(recipe.ingredients.map((i) => [i.id, i]));
  const rows = order.map((id) => {
    const i = byId.get(id)!;
    return { recipeIngredientId: i.id, ingredientSlug: i.ingredientSlug, grams: i.grams, prepMethod: i.prepMethod };
  });
  const index = new Map(order.map((id, i) => [id, i]));
  return {
    rows,
    steps: steps.map((s) => ({ position: s.position, prepMethod: s.prepMethod, cells: cellsFor(s.recipeIngredientIds, index, rows.length) })),
  };
}

function rowOrder(ids: string[], steps: RecipeInput["steps"]): string[] {
  const sets = steps.map((s) => s.recipeIngredientIds).filter((used) => used.length > 0);
  if (keepsTogether(ids, sets)) return ids;
  if (ids.length <= SEARCH_LIMIT) {
    const found = firstOrderKeepingTogether(ids, sets);
    if (found) return found;
  }
  return byFirstUse(ids, steps);
}

function keepsTogether(order: string[], sets: string[][]): boolean {
  const at = new Map(order.map((id, i) => [id, i]));
  return sets.every((used) => {
    const places = used.map((id) => at.get(id)!);
    return Math.max(...places) - Math.min(...places) + 1 === used.length;
  });
}

/** Permutations in lexicographic order of the author's positions, so the first that works is the closest. */
function firstOrderKeepingTogether(ids: string[], sets: string[][]): string[] | null {
  const perm = ids.map((_, i) => i);
  for (;;) {
    const order = perm.map((i) => ids[i]);
    if (keepsTogether(order, sets)) return order;
    let i = perm.length - 2;
    while (i >= 0 && perm[i] >= perm[i + 1]) i--;
    if (i < 0) return null;
    let j = perm.length - 1;
    while (perm[j] <= perm[i]) j--;
    [perm[i], perm[j]] = [perm[j], perm[i]];
    perm.splice(i + 1, perm.length - i - 1, ...perm.slice(i + 1).reverse());
  }
}

function byFirstUse(ids: string[], steps: RecipeInput["steps"]): string[] {
  const first = new Map<string, number>();
  for (const [s, step] of steps.entries()) {
    for (const id of step.recipeIngredientIds) if (!first.has(id)) first.set(id, s);
  }
  const author = new Map(ids.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => (first.get(a) ?? Infinity) - (first.get(b) ?? Infinity) || author.get(a)! - author.get(b)!);
}

function cellsFor(used: string[], index: Map<string, number>, rowCount: number): GridCell[] {
  // A step that names no ingredient acts on the whole recipe ("chill", "serve").
  if (used.length === 0) return [{ rowStart: 0, rowSpan: rowCount, part: 1, parts: 1, whole: true }];
  const rows = used.map((id) => index.get(id)!).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const r of rows) {
    const last = runs.at(-1);
    if (last && r === last[0] + last[1]) last[1] += 1;
    else runs.push([r, 1]);
  }
  return runs.map(([rowStart, rowSpan], i) => ({ rowStart, rowSpan, part: i + 1, parts: runs.length, whole: false }));
}
