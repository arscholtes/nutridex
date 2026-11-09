// Prep with a published retention table: a food's family picks the factor, a family prefix stands in,
// liquid discarded is the conservative reading, and a food with no family falls back to prep_effect.
import { describe, expect, test } from "vitest";
import { expand } from "../src/expand.ts";
import { PREP_METHODS, applyPrep, retentionFamilyApplies } from "../src/prep.ts";
import type { AmountFact, PrepEffectFact, RecipeInput, RetentionFact } from "../src/types.ts";

const amount = (ingredientSlug: string, compoundSlug: string, amountPer100g: number): AmountFact => ({
  ingredientSlug,
  compoundSlug,
  amountPer100g,
  unit: "mg",
  amountLow: null,
  amountHigh: null,
});

const fact = (family: string, prepMethod: string, compoundSlug: string, factor: number, liquidKept: boolean | null = null): RetentionFact => ({
  family,
  prepMethod,
  compoundSlug,
  factor,
  liquidKept,
});

const boiled = (ingredientSlug: string, retentionFamily: string | null): RecipeInput => ({
  slug: "test",
  servings: 1,
  ingredients: [{ id: `ri-${ingredientSlug}`, ingredientSlug, grams: 100, prepMethod: "boiled", retentionFamily }],
  steps: [],
});

const vitaminC = (recipe: RecipeInput, retention: RetentionFact[], prepEffects: PrepEffectFact[] = []) =>
  applyPrep(recipe, expand(recipe, [amount(recipe.ingredients[0].ingredientSlug, "vitamin-c", 100)]), prepEffects, retention)[0];

describe("applyPrep with retention facts", () => {
  const greens = fact("VEG,GREENS", "boiled", "vitamin-c", 0.5);
  const roots = fact("VEG,ROOTS,ETC", "boiled", "vitamin-c", 0.75);

  test("kale boiled uses the greens factor and carrot boiled the roots factor, for the same compound and method", () => {
    const kale = vitaminC(boiled("kale", "VEG,GREENS"), [greens, roots]);
    const carrot = vitaminC(boiled("carrot", "VEG,ROOTS,ETC"), [greens, roots]);
    expect(kale.amount).toBe(50);
    expect(carrot.amount).toBe(75);
    expect(kale.prep).toEqual([{
      ingredientSlug: "kale",
      compoundSlug: "vitamin-c",
      method: "boiled",
      retentionFactor: 0.5,
      direction: "decreases",
      note: null,
      source: "retention-table",
    }]);
  });

  test("a family's fact applies to its sub-families: BEEF covers BEEF,GROUND", () => {
    const beef = fact("BEEF", "boiled", "vitamin-c", 0.6);
    expect(vitaminC(boiled("ground-beef", "BEEF,GROUND"), [beef]).amount).toBe(60);
  });

  test("the longest matching family wins: a BEEF,GROUND fact beats the BEEF one", () => {
    const beef = fact("BEEF", "boiled", "vitamin-c", 0.6);
    const ground = fact("BEEF,GROUND", "boiled", "vitamin-c", 0.8);
    expect(vitaminC(boiled("ground-beef", "BEEF,GROUND"), [beef, ground]).amount).toBe(80);
    expect(vitaminC(boiled("ground-beef", "BEEF,GROUND"), [ground, beef]).amount).toBe(80);
  });

  test("a prefix must end at a comma: BEEF does not cover BEEFSTEAK", () => {
    expect(retentionFamilyApplies("BEEF", "BEEF,GROUND")).toBe(true);
    expect(retentionFamilyApplies("BEEF", "BEEF")).toBe(true);
    expect(retentionFamilyApplies("BEEF", "BEEFSTEAK")).toBe(false);
    expect(retentionFamilyApplies("BEEF,GROUND", "BEEF")).toBe(false);
  });

  test("liquid discarded beats liquid kept, and both beat a fact that does not say", () => {
    const kept = fact("VEG,GREENS", "boiled", "vitamin-c", 0.9, true);
    const discarded = fact("VEG,GREENS", "boiled", "vitamin-c", 0.5, false);
    const unsaid = fact("VEG,GREENS", "boiled", "vitamin-c", 0.7, null);
    expect(vitaminC(boiled("kale", "VEG,GREENS"), [kept, unsaid, discarded]).amount).toBe(50);
    expect(vitaminC(boiled("kale", "VEG,GREENS"), [kept, unsaid]).amount).toBe(70);
    expect(vitaminC(boiled("kale", "VEG,GREENS"), [kept]).amount).toBe(90);
  });

  test("among facts alike in family, method and liquid, the lowest retention is the conservative reading", () => {
    const littleWater = fact("VEG,GREENS", "boiled", "vitamin-c", 0.65, false);
    const waterToCover = fact("VEG,GREENS", "boiled", "vitamin-c", 0.5, false);
    expect(vitaminC(boiled("kale", "VEG,GREENS"), [littleWater, waterToCover]).amount).toBe(50);
  });

  test("a retention fact wins over a generic prep_effect fact for the same method and compound", () => {
    const generic: PrepEffectFact = { compoundSlug: "vitamin-c", prepMethod: "boiled", retentionFactor: 0.3, direction: "decreases", note: "generic" };
    const c = vitaminC(boiled("kale", "VEG,GREENS"), [greens], [generic]);
    expect(c.amount).toBe(50);
    expect(c.prep[0]).toMatchObject({ source: "retention-table", note: null });
  });

  test("a food with no family falls back to the prep_effect fact, and says so", () => {
    const generic: PrepEffectFact = { compoundSlug: "vitamin-c", prepMethod: "boiled", retentionFactor: 0.3, direction: "decreases", note: "generic" };
    const c = vitaminC(boiled("mystery", null), [greens, roots], [generic]);
    expect(c.amount).toBe(30);
    expect(c.prep[0]).toMatchObject({ source: "prep-effect", retentionFactor: 0.3, note: "generic" });
  });

  test("a food whose family has no fact for the method falls back to prep_effect too", () => {
    const generic: PrepEffectFact = { compoundSlug: "vitamin-c", prepMethod: "boiled", retentionFactor: 0.3, direction: "decreases", note: "generic" };
    const c = vitaminC(boiled("tomato", "TOMATOES"), [greens], [generic]);
    expect(c.amount).toBe(30);
    expect(c.prep[0]).toMatchObject({ source: "prep-effect" });
  });

  test("no fact of either kind leaves the amount alone and the note empty-handed", () => {
    const c = vitaminC(boiled("tomato", "TOMATOES"), [greens]);
    expect(c.amount).toBe(100);
    expect(c.prep[0]).toMatchObject({ retentionFactor: null, direction: null, source: null });
  });

  test("a retention factor of 1 reads as unchanged, above 1 as increases", () => {
    expect(vitaminC(boiled("kale", "VEG,GREENS"), [fact("VEG,GREENS", "boiled", "vitamin-c", 1)]).prep[0].direction).toBe("unchanged");
    expect(vitaminC(boiled("kale", "VEG,GREENS"), [fact("VEG,GREENS", "boiled", "vitamin-c", 1.1)]).prep[0].direction).toBe("increases");
  });

  test("an unknown method still throws, whether on the recipe or on a retention fact", () => {
    const typo: RecipeInput = { ...boiled("kale", "VEG,GREENS"), ingredients: [{ ...boiled("kale", "VEG,GREENS").ingredients[0], prepMethod: "boil" }] };
    expect(() => vitaminC(typo, [greens])).toThrow(/"boil"/);
    expect(() => vitaminC(boiled("kale", "VEG,GREENS"), [fact("VEG,GREENS", "boil", "vitamin-c", 0.5)])).toThrow(/"boil"/);
  });

  test("the engine knows every method the retention table names", () => {
    for (const m of ["boiled", "baked", "fried", "roasted", "broiled", "simmered", "sauteed", "steamed", "stewed", "braised", "reheated", "toasted", "poached"]) {
      expect(PREP_METHODS).toContain(m);
    }
  });
});
