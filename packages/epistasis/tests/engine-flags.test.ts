// Modifiers, cautions, effects and goal scores: what the totals mean.
import { describe, expect, test } from "vitest";
import { collectCautions } from "../src/cautions.ts";
import { rollUpEffects } from "../src/effects.ts";
import { scoreGoals } from "../src/goals.ts";
import { checkModifiers } from "../src/modifiers.ts";
import type { EngineSettings } from "../src/settings.ts";
import type { CautionFact, CompoundEffectFact, CompoundTotal, MassUnit, ModifierFact } from "../src/types.ts";

const settings: EngineSettings = {
  gradeWeights: { A: 1, B: 0.6, C: 0.25, D: 0.1 },
  fatThresholdG: 3,
  referenceAmounts: {},
};

const total = (compoundSlug: string, amount: number | null, unit: MassUnit | null = "µg", missingFrom: string[] = []): CompoundTotal => ({
  compoundSlug,
  amount,
  unit: amount === null ? null : unit,
  range: null,
  contributors: [],
  missingFrom,
});

const modifier = (over: Partial<ModifierFact>): ModifierFact => ({
  id: "rule-1",
  targetCompoundSlug: "beta-carotene",
  modifierCompoundSlug: null,
  condition: "dietary fat present",
  direction: "enhances",
  magnitude: null,
  mechanism: null,
  grade: "B",
  modifierFoundIn: [],
  basis: "measured",
  ...over,
});

describe("checkModifiers", () => {
  const fatRule = modifier({});
  const juice = ["apple", "carrot"];
  /** total-fat per serving, measured in every listed ingredient unless named in `unmeasured` */
  const fat = (grams: number, measured: string[] = juice): CompoundTotal => ({
    ...total("total-fat", grams, "g"),
    contributors: measured.map((ingredientSlug) => ({ ingredientSlug, amount: grams / measured.length })),
  });

  test("too little fat is a missed opportunity, with the amount, the setting and a suggestion", () => {
    const [flag] = checkModifiers([total("beta-carotene", 9000), fat(0.6)], juice, [fatRule], settings);
    expect(flag).toEqual({
      compoundSlug: "beta-carotene",
      status: "missed",
      reason: "0.6 g of fat per serving, under the 3 g that counts as enough",
      suggestion: "Add a fat, such as olive oil",
      grade: "B",
      basis: "measured",
      ruleIds: ["rule-1"],
    });
  });

  test("enough fat enhances", () => {
    const [flag] = checkModifiers([total("beta-carotene", 9000), fat(14)], juice, [fatRule], settings);
    expect(flag).toMatchObject({ status: "enhanced", reason: "14 g of fat per serving, at or above the 3 g that counts as enough" });
  });

  test("reads the threshold from settings", () => {
    const [flag] = checkModifiers([total("beta-carotene", 9000), fat(14)], juice, [fatRule], { ...settings, fatThresholdG: 20 });
    expect(flag.status).toBe("missed");
  });

  test("is unknown, not missed, when an ingredient has no measured fat and the rest fall short", () => {
    const [flag] = checkModifiers([total("beta-carotene", 9000), fat(1, ["apple"])], juice, [fatRule], settings);
    expect(flag).toMatchObject({ status: "unknown", reason: "1 g of fat per serving, but no fat amount for carrot" });
    const [none] = checkModifiers([total("beta-carotene", 9000)], juice, [fatRule], settings);
    expect(none).toMatchObject({ status: "unknown", reason: "0 g of fat per serving, but no fat amount for apple, carrot" });
  });

  test("enough measured fat enhances even when another ingredient's fat is unmeasured", () => {
    const [flag] = checkModifiers([total("beta-carotene", 9000), fat(14, ["apple"])], juice, [fatRule], settings);
    expect(flag.status).toBe("enhanced");
  });

  test("a modifier compound in the recipe enhances, even when its amount is unmeasured", () => {
    const rule = modifier({ targetCompoundSlug: "curcumin", modifierCompoundSlug: "piperine", condition: null });
    const [flag] = checkModifiers([total("curcumin", 3000), total("piperine", null)], juice, [rule], settings);
    expect(flag).toMatchObject({ compoundSlug: "curcumin", status: "enhanced", reason: "piperine is in the recipe" });
  });

  test("a missing modifier compound is a missed opportunity naming what carries it", () => {
    const rule = modifier({ targetCompoundSlug: "curcumin", modifierCompoundSlug: "piperine", condition: null, modifierFoundIn: ["Black pepper"] });
    const [flag] = checkModifiers([total("curcumin", 3000)], juice, [rule], settings);
    expect(flag).toMatchObject({ status: "missed", reason: "no piperine in the recipe", suggestion: "Add Black pepper for its piperine" });
  });

  test("an inhibitor in the recipe reduces; an absent one says nothing", () => {
    const rule = modifier({ targetCompoundSlug: "calcium", modifierCompoundSlug: "oxalate", condition: null, direction: "inhibits" });
    expect(checkModifiers([total("calcium", 100, "mg"), total("oxalate", null)], juice, [rule], settings)).toEqual([
      { compoundSlug: "calcium", status: "reduced", reason: "oxalate is in the recipe", grade: "B", basis: "measured", ruleIds: ["rule-1"] },
    ]);
    expect(checkModifiers([total("calcium", 100, "mg")], juice, [rule], settings)).toEqual([]);
  });

  test("an inhibiting condition that is met reduces; one that is not met says nothing", () => {
    const rule = modifier({ direction: "inhibits" });
    expect(checkModifiers([total("beta-carotene", 9000), fat(14)], juice, [rule], settings)).toEqual([
      {
        compoundSlug: "beta-carotene",
        status: "reduced",
        reason: "14 g of fat per serving, at or above the 3 g that counts as enough",
        grade: "B",
        basis: "measured",
        ruleIds: ["rule-1"],
      },
    ]);
    expect(checkModifiers([total("beta-carotene", 9000), fat(0.6)], juice, [rule], settings)).toEqual([]);
  });

  test("ignores rules whose target the recipe does not contain, or contains at zero", () => {
    expect(checkModifiers([fat(14)], juice, [fatRule], settings)).toEqual([]);
    expect(checkModifiers([total("beta-carotene", 0), fat(14)], juice, [fatRule], settings)).toEqual([]);
  });

  test("says whether a flag rests on a measurement or on the compound's class", () => {
    const [flag] = checkModifiers([total("beta-carotene", 9000), fat(0.6)], juice, [modifier({ basis: "by-class" })], settings);
    expect(flag.basis).toBe("by-class");
  });

  test("two rules saying the same thing about one compound make one flag, with the best grade and both rules", () => {
    const weaker = modifier({ id: "rule-c", grade: "C", basis: "by-class" });
    const stronger = modifier({ id: "rule-b", grade: "B", basis: "measured" });
    const flags = checkModifiers([total("beta-carotene", 9000), fat(0.6)], juice, [weaker, stronger], settings);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ status: "missed", grade: "B", basis: "measured", ruleIds: ["rule-c", "rule-b"] });
  });

  test("a measured rule and a class guess make one flag, graded by the measurement and naming both, in either order", () => {
    const guess = modifier({ id: "class-a", grade: "A", basis: "by-class" });
    const measured = modifier({ id: "measured-c", grade: "C", basis: "measured" });
    for (const rules of [[guess, measured], [measured, guess]]) {
      const flags = checkModifiers([total("beta-carotene", 9000), fat(0.6)], juice, rules, settings);
      expect(flags).toHaveLength(1);
      expect(flags[0]).toMatchObject({ grade: "C", basis: "measured" });
      expect([...flags[0].ruleIds].sort()).toEqual(["class-a", "measured-c"]);
    }
  });

  test("rules that disagree in direction stay separate flags", () => {
    const helps = modifier({ id: "helps", targetCompoundSlug: "calcium", modifierCompoundSlug: "oxalate", condition: null });
    const hurts = modifier({ id: "hurts", targetCompoundSlug: "calcium", modifierCompoundSlug: "oxalate", condition: null, direction: "inhibits" });
    const flags = checkModifiers([total("calcium", 100, "mg"), total("oxalate", null)], juice, [helps, hurts], settings);
    expect(flags.map((f) => [f.status, f.ruleIds])).toEqual([["enhanced", ["helps"]], ["reduced", ["hurts"]]]);
  });

  test("refuses a condition it does not know how to test", () => {
    const rule = modifier({ condition: "eaten at noon" });
    expect(() => checkModifiers([total("beta-carotene", 9000)], juice, [rule], settings)).toThrow(/eaten at noon/);
  });
});

describe("collectCautions", () => {
  const warfarin: CautionFact = { compoundSlug: "vitamin-k1", ingredientSlug: null, kind: "drug-interaction", summary: "Vitamin K counters warfarin", grade: "A" };
  const allergy: CautionFact = { compoundSlug: null, ingredientSlug: "egg", kind: "allergen", summary: "Egg allergy", grade: "A" };

  test("collects cautions for compounds and ingredients in the recipe, once each", () => {
    const out = collectCautions([total("vitamin-k1", 400)], ["kale", "egg"], [warfarin, warfarin, allergy], []);
    expect(out).toEqual([
      {
        kind: "drug-interaction",
        summary: "Vitamin K counters warfarin",
        grade: "A",
        compoundSlug: "vitamin-k1",
        ingredientSlug: null,
        advice: "Ask a pharmacist or doctor before combining them.",
      },
      { kind: "allergen", summary: "Egg allergy", grade: "A", compoundSlug: null, ingredientSlug: "egg" },
    ]);
  });

  test("leaves out cautions for what the recipe does not contain", () => {
    expect(collectCautions([total("beta-carotene", 9000)], ["carrot"], [warfarin, allergy], [])).toEqual([]);
  });

  test("warns when a serving's total crosses the compound's upper limit, converting units", () => {
    const out = collectCautions([total("vitamin-c", 2.5, "g")], [], [], [{ compoundSlug: "vitamin-c", amount: 2000, unit: "mg" }]);
    expect(out).toEqual([
      { kind: "excess", summary: "2500 mg of vitamin-c per serving, above the 2000 mg upper limit", grade: null, compoundSlug: "vitamin-c", ingredientSlug: null },
    ]);
    expect(collectCautions([total("vitamin-c", 90, "mg")], [], [], [{ compoundSlug: "vitamin-c", amount: 2000, unit: "mg" }])).toEqual([]);
  });
});

describe("rollUpEffects", () => {
  const facts: CompoundEffectFact[] = [
    { compoundSlug: "beta-carotene", effectSlug: "skin-color", direction: "benefit", onset: "~6 weeks", grade: "B" },
    { compoundSlug: "lycopene", effectSlug: "skin-color", direction: "benefit", onset: "~8 weeks", grade: "C" },
    { compoundSlug: "nitrate", effectSlug: "blood-pressure", direction: "benefit", onset: "2-3 hours", grade: "A" },
    { compoundSlug: "oxalate", effectSlug: "kidney-stones", direction: "risk", onset: null, grade: "B" },
  ];

  test("groups by effect with its compounds, best grade and that grade's onset; benefits before risks", () => {
    const out = rollUpEffects([total("beta-carotene", 9000), total("lycopene", 10), total("nitrate", 250, "mg"), total("oxalate", null)], facts);
    expect(out).toEqual([
      { effectSlug: "blood-pressure", direction: "benefit", bestGrade: "A", compounds: ["nitrate"], onset: "2-3 hours" },
      { effectSlug: "skin-color", direction: "benefit", bestGrade: "B", compounds: ["beta-carotene", "lycopene"], onset: "~6 weeks" },
      { effectSlug: "kidney-stones", direction: "risk", bestGrade: "B", compounds: ["oxalate"], onset: null },
    ]);
  });

  test("leaves out effects of compounds the recipe does not contain", () => {
    expect(rollUpEffects([total("nitrate", 250, "mg")], facts).map((e) => e.effectSlug)).toEqual(["blood-pressure"]);
  });
});

describe("scoreGoals", () => {
  const facts: CompoundEffectFact[] = [
    { compoundSlug: "beta-carotene", effectSlug: "skin-color", direction: "benefit", onset: null, grade: "C" },
    { compoundSlug: "beta-carotene", effectSlug: "skin-color", direction: "benefit", onset: null, grade: "B" },
    { compoundSlug: "lycopene", effectSlug: "skin-color", direction: "benefit", onset: null, grade: "C" },
    { compoundSlug: "lutein-zeaxanthin", effectSlug: "skin-color", direction: "benefit", onset: null, grade: "C" },
  ];
  const withRefs: EngineSettings = {
    ...settings,
    referenceAmounts: { "beta-carotene": { amount: 6, unit: "mg" }, lycopene: { amount: 10000, unit: "µg" } },
  };

  test("sums amount over its reference × the weight of each compound's best grade", () => {
    const out = scoreGoals([total("beta-carotene", 9000), total("lycopene", 5000)], facts, ["skin-color"], withRefs);
    expect(out["skin-color"].score).toBeCloseTo(1.5 * 0.6 + 0.5 * 0.25, 9);
  });

  test("names compounds it could not score instead of counting them as zero", () => {
    const out = scoreGoals([total("beta-carotene", 9000), total("lutein-zeaxanthin", 2000), total("lycopene", null)], facts, ["skin-color"], withRefs);
    expect(out["skin-color"]).toEqual({ score: 1.5 * 0.6, unscored: ["lycopene", "lutein-zeaxanthin"] });
  });

  test("takes the weights from settings", () => {
    const out = scoreGoals([total("beta-carotene", 6000)], facts, ["skin-color"], { ...withRefs, gradeWeights: { A: 1, B: 0.5, C: 0, D: 0 } });
    expect(out["skin-color"].score).toBe(0.5);
  });
});
