// Expand, apply prep and aggregate: from grams of each ingredient to compound totals per serving.
import { describe, expect, test } from "vitest";
import { aggregate } from "../src/aggregate.ts";
import { expand } from "../src/expand.ts";
import { PREP_METHODS, applyPrep, effectivePrep } from "../src/prep.ts";
import type { AmountFact, PrepEffectFact, RecipeInput } from "../src/types.ts";

const amount = (ingredientSlug: string, compoundSlug: string, amountPer100g: number | null, extra: Partial<AmountFact> = {}): AmountFact => ({
  ingredientSlug,
  compoundSlug,
  amountPer100g,
  unit: amountPer100g === null ? null : "µg",
  amountLow: null,
  amountHigh: null,
  ...extra,
});

const recipe = (over: Partial<RecipeInput> = {}): RecipeInput => ({
  slug: "test",
  servings: 1,
  ingredients: [
    { id: "ri-carrot", ingredientSlug: "carrot", grams: 200, prepMethod: "raw" },
    { id: "ri-kale", ingredientSlug: "kale", grams: 50, prepMethod: "raw" },
  ],
  steps: [],
  ...over,
});

describe("expand", () => {
  test("scales each amount per 100 g to the grams used", () => {
    const out = expand(recipe(), [amount("carrot", "beta-carotene", 8000), amount("kale", "beta-carotene", 6000)]);
    expect(out.map((c) => [c.ingredientSlug, c.amount])).toEqual([
      ["carrot", 16000],
      ["kale", 3000],
    ]);
  });

  test("carries the low–high range through the same scaling", () => {
    const [c] = expand(recipe(), [amount("carrot", "beta-carotene", 8000, { amountLow: 6000, amountHigh: 10000 })]);
    expect(c.range).toEqual([12000, 20000]);
  });

  test("keeps an unmeasured amount as null, not zero", () => {
    const [c] = expand(recipe(), [amount("carrot", "pectin", null)]);
    expect(c.amount).toBeNull();
  });

  test("ignores facts for ingredients the recipe does not use", () => {
    expect(expand(recipe(), [amount("beet", "nitrate", 250)])).toEqual([]);
  });
});

describe("effectivePrep", () => {
  test("is the ingredient's own method when no step names one", () => {
    expect(effectivePrep(recipe().ingredients[0], [])).toBe("raw");
  });

  test("is overridden by the last step that names a method and uses the ingredient", () => {
    const steps = [
      { position: 2, prepMethod: "juiced", recipeIngredientIds: ["ri-carrot"] },
      { position: 1, prepMethod: "blended", recipeIngredientIds: ["ri-carrot"] },
      { position: 3, prepMethod: null, recipeIngredientIds: ["ri-carrot"] },
      { position: 4, prepMethod: "boiled", recipeIngredientIds: ["ri-kale"] },
    ];
    expect(effectivePrep(recipe().ingredients[0], steps)).toBe("juiced");
  });
});

describe("applyPrep", () => {
  const juiced: PrepEffectFact = {
    compoundSlug: "beta-carotene",
    prepMethod: "juiced",
    retentionFactor: 0.5,
    direction: "decreases",
    note: "half stays in the pulp",
  };
  const juicedRecipe = recipe({ ingredients: [{ id: "ri-carrot", ingredientSlug: "carrot", grams: 100, prepMethod: "juiced" }] });

  test("leaves raw ingredients as their source records them", () => {
    const [c] = applyPrep(recipe(), expand(recipe(), [amount("carrot", "beta-carotene", 8000)]), [juiced]);
    expect(c).toMatchObject({ amount: 16000, prep: null });
  });

  test("multiplies amount and range by a sourced retention factor and attaches its note", () => {
    const facts = [amount("carrot", "beta-carotene", 8000, { amountLow: 6000, amountHigh: 10000 })];
    const [c] = applyPrep(juicedRecipe, expand(juicedRecipe, facts), [juiced]);
    expect(c.amount).toBe(4000);
    expect(c.range).toEqual([3000, 5000]);
    expect(c.prep).toMatchObject({ method: "juiced", retentionFactor: 0.5, note: "half stays in the pulp" });
  });

  test("says when no source gives a retention factor, instead of assuming 100%", () => {
    const [c] = applyPrep(juicedRecipe, expand(juicedRecipe, [amount("carrot", "vitamin-c", 6)]), [juiced]);
    expect(c.amount).toBe(6);
    expect(c.prep).toEqual({
      ingredientSlug: "carrot",
      compoundSlug: "vitamin-c",
      method: "juiced",
      retentionFactor: null,
      direction: null,
      note: null,
    });
  });

  test("accepts the methods in its vocabulary, raw and juiced among them", () => {
    expect(PREP_METHODS).toEqual(["raw", "juiced", "blended", "boiled", "roasted", "fermented"]);
    expect(() => applyPrep(recipe(), expand(recipe(), [amount("carrot", "beta-carotene", 8000)]), [juiced])).not.toThrow();
  });

  test("refuses a recipe's prep method outside its vocabulary, naming it", () => {
    const typo = recipe({ ingredients: [{ id: "ri-carrot", ingredientSlug: "carrot", grams: 100, prepMethod: "juice" }] });
    expect(() => applyPrep(typo, expand(typo, [amount("carrot", "beta-carotene", 8000)]), [])).toThrow(/"juice"/);
  });

  test("refuses a prep fact whose method is outside its vocabulary, rather than never matching it", () => {
    expect(() => applyPrep(recipe(), [], [{ ...juiced, prepMethod: "juice" }])).toThrow(/"juice"/);
  });

  test("keeps a qualitative direction when the source gives no number", () => {
    const lost: PrepEffectFact = { compoundSlug: "pectin", prepMethod: "juiced", retentionFactor: null, direction: "decreases", note: "fiber stays in the pulp" };
    const [c] = applyPrep(juicedRecipe, expand(juicedRecipe, [amount("carrot", "pectin", null)]), [lost]);
    expect(c.prep).toMatchObject({ retentionFactor: null, direction: "decreases", note: "fiber stays in the pulp" });
  });
});

describe("aggregate", () => {
  test("sums each compound across ingredients and divides by servings, keeping the breakdown", () => {
    const r = recipe({ servings: 2 });
    const [total] = aggregate(r, expand(r, [amount("carrot", "beta-carotene", 8000), amount("kale", "beta-carotene", 6000)]));
    expect(total).toEqual({
      compoundSlug: "beta-carotene",
      amount: 9500,
      unit: "µg",
      range: null,
      contributors: [
        { ingredientSlug: "carrot", amount: 8000 },
        { ingredientSlug: "kale", amount: 1500 },
      ],
      missingFrom: [],
    });
  });

  test("adds ranges only when every contributor has one", () => {
    const r = recipe();
    const both = aggregate(r, expand(r, [
      amount("carrot", "beta-carotene", 8000, { amountLow: 6000, amountHigh: 10000 }),
      amount("kale", "beta-carotene", 6000, { amountLow: 4000, amountHigh: 8000 }),
    ]));
    expect(both[0].range).toEqual([14000, 24000]);
    const one = aggregate(r, expand(r, [
      amount("carrot", "beta-carotene", 8000, { amountLow: 6000, amountHigh: 10000 }),
      amount("kale", "beta-carotene", 6000),
    ]));
    expect(one[0].range).toBeNull();
  });

  test("names the ingredients whose amount is missing rather than counting them as zero", () => {
    const r = recipe();
    const [total] = aggregate(r, expand(r, [amount("carrot", "vitamin-c", 6), amount("kale", "vitamin-c", null)]));
    expect(total).toMatchObject({ amount: 12, missingFrom: ["kale"] });
  });

  test("is null when no ingredient's amount is known", () => {
    const r = recipe();
    const [total] = aggregate(r, expand(r, [amount("carrot", "pectin", null)]));
    expect(total).toMatchObject({ amount: null, unit: null, missingFrom: ["carrot"] });
  });

  test("adds one compound measured in two mass units, in the first contributor's unit", () => {
    const r = recipe();
    const facts = [amount("carrot", "vitamin-c", 6, { unit: "mg" }), amount("kale", "vitamin-c", 90, { unit: "µg" })];
    const [total] = aggregate(r, expand(r, facts));
    expect(total.unit).toBe("mg");
    expect(total.amount).toBeCloseTo(12.045, 9);
    expect(total.contributors[1].amount).toBeCloseTo(0.045, 9);
  });
});
