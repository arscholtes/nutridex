import { describe, expect, it } from "vitest";
import type { RecipeInput } from "epistasis";
import { recipeGrid } from "../lib/recipe-grid.ts";

function recipe(ingredients: string[], steps: { prep: string | null; uses: string[] }[]): RecipeInput {
  return {
    slug: "test",
    servings: 1,
    ingredients: ingredients.map((slug) => ({ id: `ri-${slug}`, ingredientSlug: slug, grams: 100, prepMethod: "raw", retentionFamily: null })),
    steps: steps.map((s, i) => ({ position: i + 1, prepMethod: s.prep, recipeIngredientIds: s.uses.map((slug) => `ri-${slug}`) })),
  };
}

const order = (r: RecipeInput) => recipeGrid(r).rows.map((row) => row.ingredientSlug);
const spans = (r: RecipeInput, step: number) =>
  recipeGrid(r).steps[step].cells.map((c) => [c.rowStart, c.rowSpan]);

describe("recipeGrid", () => {
  it("keeps the author's order when every step's ingredients already sit together", () => {
    const r = recipe(["carrot", "orange", "olive-oil"], [
      { prep: "juiced", uses: ["carrot", "orange"] },
      { prep: null, uses: ["olive-oil"] },
    ]);
    expect(order(r)).toEqual(["carrot", "orange", "olive-oil"]);
    expect(spans(r, 0)).toEqual([[0, 2]]);
  });

  it("reorders rows so a step that uses ingredients apart in the list spans one cell", () => {
    const r = recipe(["carrot", "olive-oil", "orange"], [
      { prep: "juiced", uses: ["carrot", "orange"] },
      { prep: null, uses: ["olive-oil"] },
    ]);
    expect(order(r)).toEqual(["carrot", "orange", "olive-oil"]);
    expect(spans(r, 0)).toEqual([[0, 2]]);
    expect(spans(r, 1)).toEqual([[2, 1]]);
  });

  it("finds an order the first-used rule misses, closest to the author's", () => {
    // By first use: a, b (step 1), c (step 2) leaves step 2's {a, c} apart. b, a, c works.
    const r = recipe(["a", "b", "c"], [{ prep: "x", uses: ["a", "b"] }, { prep: "y", uses: ["a", "c"] }]);
    expect(order(r)).toEqual(["b", "a", "c"]);
    expect(spans(r, 0)).toEqual([[0, 2]]);
    expect(spans(r, 1)).toEqual([[1, 2]]);
  });

  it("splits a step into marked parts when no order lets every step sit together", () => {
    // Three steps each pairing two of a, b, c with d in all of them cannot all be contiguous.
    const r = recipe(["a", "b", "c", "d"], [
      { prep: "x", uses: ["a", "d"] },
      { prep: "y", uses: ["b", "d"] },
      { prep: "z", uses: ["c", "d"] },
    ]);
    const grid = recipeGrid(r);
    const split = grid.steps.filter((s) => s.cells.length > 1);
    expect(split.length).toBeGreaterThan(0);
    for (const s of split) {
      expect(s.cells.map((c) => c.part)).toEqual(s.cells.map((_, i) => i + 1));
      expect(s.cells.every((c) => c.parts === s.cells.length)).toBe(true);
    }
    // Every ingredient a step uses is covered by exactly one of its cells.
    for (const [i, s] of r.steps.entries()) {
      const covered = grid.steps[i].cells.flatMap((c) => grid.rows.slice(c.rowStart, c.rowStart + c.rowSpan).map((row) => row.recipeIngredientId));
      expect(covered.sort()).toEqual([...s.recipeIngredientIds].sort());
    }
  });

  it("gives a step that names no ingredient one cell across the whole recipe", () => {
    const r = recipe(["carrot", "orange"], [{ prep: "juiced", uses: ["carrot", "orange"] }, { prep: null, uses: [] }]);
    expect(recipeGrid(r).steps[1].cells).toEqual([{ rowStart: 0, rowSpan: 2, part: 1, parts: 1, whole: true }]);
  });

  it("orders the step columns by position, whatever order they arrive in", () => {
    const r = recipe(["carrot"], [{ prep: "juiced", uses: ["carrot"] }, { prep: "chilled", uses: ["carrot"] }]);
    r.steps.reverse();
    expect(recipeGrid(r).steps.map((s) => s.position)).toEqual([1, 2]);
  });

  it("keeps grams and prep on each row, straight from the recipe", () => {
    const r = recipe(["carrot"], []);
    r.ingredients[0].grams = 280;
    r.ingredients[0].prepMethod = "juiced";
    expect(recipeGrid(r).rows).toEqual([{ recipeIngredientId: "ri-carrot", ingredientSlug: "carrot", grams: 280, prepMethod: "juiced" }]);
  });
});
