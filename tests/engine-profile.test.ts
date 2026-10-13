// The whole pipeline on one recipe: every step's output lands in the profile.
import { describe, expect, test } from "vitest";
import { recipeProfile } from "../lib/engine/profile.ts";
import type { EngineSettings } from "../lib/engine/settings.ts";
import type { Facts, RecipeInput } from "../lib/engine/types.ts";

const settings: EngineSettings = { gradeWeights: { A: 1, B: 0.6, C: 0.25, D: 0.1 }, fatThresholdG: 3, referenceAmounts: { "beta-carotene": { amount: 1, unit: "mg" } } };

const smoothie: RecipeInput = {
  slug: "smoothie",
  servings: 2,
  ingredients: [
    { id: "ri-1", ingredientSlug: "carrot", grams: 200, prepMethod: "raw" },
    { id: "ri-2", ingredientSlug: "kale", grams: 100, prepMethod: "raw" },
  ],
  steps: [{ position: 1, prepMethod: "blended", recipeIngredientIds: ["ri-1", "ri-2"] }],
};

const facts: Facts = {
  amounts: [
    { ingredientSlug: "carrot", compoundSlug: "beta-carotene", amountPer100g: 8000, unit: "µg", amountLow: null, amountHigh: null },
    { ingredientSlug: "kale", compoundSlug: "vitamin-k1", amountPer100g: 400, unit: "µg", amountLow: null, amountHigh: null },
    { ingredientSlug: "carrot", compoundSlug: "total-fat", amountPer100g: 0.2, unit: "g", amountLow: null, amountHigh: null },
    { ingredientSlug: "kale", compoundSlug: "total-fat", amountPer100g: 1, unit: "g", amountLow: null, amountHigh: null },
  ],
  prepEffects: [{ compoundSlug: "beta-carotene", prepMethod: "blended", retentionFactor: null, direction: "increases", note: "blending frees it from cell walls" }],
  modifiers: [
    { targetCompoundSlug: "beta-carotene", modifierCompoundSlug: null, condition: "dietary fat present", direction: "enhances", magnitude: null, mechanism: null, grade: "B", modifierFoundIn: [] },
  ],
  cautions: [{ compoundSlug: "vitamin-k1", ingredientSlug: null, kind: "drug-interaction", summary: "Vitamin K counters warfarin", grade: "A" }],
  compoundEffects: [{ compoundSlug: "beta-carotene", effectSlug: "skin-color", direction: "benefit", onset: "~6 weeks", grade: "B" }],
  upperLimits: [],
};

describe("recipeProfile", () => {
  const profile = recipeProfile(smoothie, facts, settings, ["skin-color"]);

  test("totals per serving after the step's prep", () => {
    expect(profile.perServing.find((t) => t.compoundSlug === "beta-carotene")).toMatchObject({ amount: 8000, unit: "µg" });
  });

  test("lists every prep note, including blended contributions with no retention factor", () => {
    expect(profile.prep.map((p) => [p.ingredientSlug, p.compoundSlug, p.method, p.direction])).toEqual([
      ["carrot", "beta-carotene", "blended", "increases"],
      ["carrot", "total-fat", "blended", null],
      ["kale", "vitamin-k1", "blended", null],
      ["kale", "total-fat", "blended", null],
    ]);
  });

  test("flags absorption, cautions, effects and goal scores from the same totals", () => {
    expect(profile.absorption).toMatchObject([{ compoundSlug: "beta-carotene", status: "missed" }]);
    expect(profile.cautions).toMatchObject([{ kind: "drug-interaction", compoundSlug: "vitamin-k1" }]);
    expect(profile.effects).toMatchObject([{ effectSlug: "skin-color", bestGrade: "B" }]);
    expect(profile.goalScores["skin-color"].score).toBeCloseTo(8 * 0.6, 9);
  });
});
