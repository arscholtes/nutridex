// Cooking along with a recipe: the stages someone steps through, and what having cooked it records.
import { describe, expect, test } from "vitest";
import type { PrepNote, RecipeInput } from "epistasis";
import { cookedCatches, cookStages, formOf } from "../lib/cook-along.ts";
import { recipeGrid } from "../lib/recipe-grid.ts";

const AT = "2026-11-13T12:00:00.000Z";

function page(ingredients: [string, string][], steps: { title: string; prep: string | null; uses: string[] }[], prep: PrepNote[] = []) {
  const recipe: RecipeInput = {
    slug: "test",
    servings: 1,
    ingredients: ingredients.map(([slug, method]) => ({ id: `ri-${slug}`, ingredientSlug: slug, grams: 100, prepMethod: method, retentionFamily: null })),
    steps: steps.map((s, i) => ({ position: i + 1, prepMethod: s.prep, recipeIngredientIds: s.uses.map((slug) => `ri-${slug}`) })),
  };
  return {
    slug: "test",
    grid: recipeGrid(recipe),
    profile: { prep },
    stepTitles: Object.fromEntries(steps.map((s, i) => [i + 1, s.title])),
  };
}

const note = (ingredientSlug: string, method: string, compoundSlug = "vitamin-c"): PrepNote => ({ ingredientSlug, compoundSlug, method, retentionFactor: 0.8, direction: null, note: null });

describe("the stages of cooking along", () => {
  test("a recipe with no steps has one stage for each ingredient, in the grid's order", () => {
    const stages = cookStages(page([["carrot", "juiced"], ["kale", "juiced"]], []));
    expect(stages.map((s) => [s.step, s.prepMethod, s.foods.map((f) => f.slug)])).toEqual([[null, "juiced", ["carrot"]], [null, "juiced", ["kale"]]]);
    expect(stages[0].foods[0]).toEqual({ slug: "carrot", grams: 100, prepMethod: "juiced" });
  });

  test("a recipe with steps has one stage for each step, holding the foods it uses", () => {
    const stages = cookStages(page([["carrot", "raw"], ["egg", "raw"], ["olive-oil", "raw"]], [
      { title: "Fry", prep: "fried", uses: ["carrot", "egg"] },
      { title: "Dress", prep: null, uses: ["olive-oil"] },
    ]));
    expect(stages.map((s) => [s.step, s.title, s.prepMethod, s.foods.map((f) => f.slug)])).toEqual([[1, "Fry", "fried", ["carrot", "egg"]], [2, "Dress", null, ["olive-oil"]]]);
  });

  test("what a stage does to a compound is listed on that stage and no other", () => {
    const stages = cookStages(page([["carrot", "raw"], ["egg", "raw"]], [
      { title: "Boil", prep: "boiled", uses: ["carrot"] },
      { title: "Fry", prep: "fried", uses: ["carrot", "egg"] },
    ], [note("carrot", "boiled"), note("egg", "fried"), note("egg", "boiled")]));
    expect(stages[0].prep.map((p) => [p.ingredientSlug, p.method])).toEqual([["carrot", "boiled"]]);
    expect(stages[1].prep.map((p) => [p.ingredientSlug, p.method])).toEqual([["egg", "fried"]]);
  });

  test("an ingredient's own preparation is noted on the first step that uses it", () => {
    const stages = cookStages(page([["egg", "raw"], ["carrot", "juiced"]], [
      { title: "Crack", prep: null, uses: ["egg"] },
      { title: "Pour", prep: null, uses: ["carrot"] },
      { title: "Serve", prep: null, uses: ["carrot"] },
    ], [note("carrot", "juiced")]));
    expect(stages.map((s) => s.prep.length)).toEqual([0, 1, 0]);
  });

  test("a step that names no ingredient acts on the whole recipe", () => {
    const stages = cookStages(page([["egg", "raw"], ["carrot", "raw"]], [{ title: "Chill", prep: null, uses: [] }]));
    expect(stages[0].foods.map((f) => f.slug)).toEqual(["egg", "carrot"]);
  });
});

describe("the form a food was had in", () => {
  test("raw and juiced stay as they are, heat is cooked, and anything else is not said", () => {
    expect(["raw", "juiced", "boiled", "fried", "steamed", "blended", "fermented"].map(formOf)).toEqual(["raw", "juiced", "cooked", "cooked", "cooked", null, null]);
  });
});

describe("having cooked a recipe", () => {
  test("is a catch of every food in it, in that recipe", () => {
    const p = page([["carrot", "juiced"], ["egg", "raw"]], [{ title: "Fry", prep: "fried", uses: ["egg"] }]);
    expect(cookedCatches(p, AT)).toEqual([
      { food: "carrot", encounteredAt: AT, form: "juiced", recipe: "test" },
      { food: "egg", encounteredAt: AT, form: "cooked", recipe: "test" },
    ]);
  });

  test("names a food once when the recipe lists it twice", () => {
    const p = page([["carrot", "raw"]], []);
    p.grid.rows.push({ ...p.grid.rows[0], recipeIngredientId: "ri-carrot-2" });
    expect(cookedCatches(p, AT)).toHaveLength(1);
  });
});
