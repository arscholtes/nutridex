// The microbiome feed check and supplement stacks: food plus pills, against upper limits.
import { describe, expect, test } from "vitest";
import { collectCautions } from "../lib/engine/cautions.ts";
import { feedCheck } from "../lib/engine/microbes.ts";
import { checkExcess, stackTotals } from "../lib/engine/stack.ts";
import type { CompoundTotal, MassUnit, MicrobeMetaboliteFact, MicrobeSubstrateFact } from "../lib/engine/types.ts";

const total = (compoundSlug: string, amount: number | null, unit: MassUnit | null = "g"): CompoundTotal => ({
  compoundSlug,
  amount,
  unit: amount === null ? null : unit,
  range: null,
  contributors: [],
  missingFrom: [],
});

describe("feedCheck", () => {
  const substrates: MicrobeSubstrateFact[] = [
    { microbeSlug: "bifidobacterium", compoundSlug: "inulin", relationship: "ferments", grade: "A" },
    { microbeSlug: "bifidobacterium", compoundSlug: "pectin", relationship: "ferments", grade: "C" },
    { microbeSlug: "faecalibacterium", compoundSlug: "inulin", relationship: "promoted-by", grade: "B" },
    { microbeSlug: "faecalibacterium", compoundSlug: "emulsifier", relationship: "inhibited-by", grade: "C" },
    { microbeSlug: "akkermansia", compoundSlug: "polyphenol-x", relationship: "promoted-by", grade: "C" },
  ];
  const metabolites: MicrobeMetaboliteFact[] = [
    { microbeSlug: "bifidobacterium", substrateCompoundSlug: "inulin", productCompoundSlug: "acetate", grade: "B" },
    { microbeSlug: "bifidobacterium", substrateCompoundSlug: "resistant-starch", productCompoundSlug: "lactate", grade: "B" },
    { microbeSlug: "faecalibacterium", substrateCompoundSlug: null, productCompoundSlug: "butyrate", grade: "A" },
  ];

  test("ranks microbes by what feeds them × evidence weight, with what they would make", () => {
    const out = feedCheck([total("inulin", 4), total("pectin", 2000, "mg")], substrates, metabolites, { A: 1, B: 0.6, C: 0.25, D: 0.1 });
    expect(out).toEqual([
      {
        microbeSlug: "bifidobacterium",
        score: 4 * 1 + 2 * 0.25,
        feeds: [{ compoundSlug: "inulin", grams: 4 }, { compoundSlug: "pectin", grams: 2 }],
        metabolites: ["acetate"],
        heldBackBy: [],
      },
      { microbeSlug: "faecalibacterium", score: 4 * 0.6, feeds: [{ compoundSlug: "inulin", grams: 4 }], metabolites: ["butyrate"], heldBackBy: [] },
    ]);
  });

  test("lists an unmeasured feed without counting it, and names what holds a microbe back", () => {
    const out = feedCheck([total("pectin", null), total("emulsifier", 1)], substrates, metabolites, { A: 1, B: 0.6, C: 0.25, D: 0.1 });
    expect(out).toEqual([
      { microbeSlug: "bifidobacterium", score: 0, feeds: [{ compoundSlug: "pectin", grams: null }], metabolites: [], heldBackBy: [] },
      { microbeSlug: "faecalibacterium", score: 0, feeds: [], metabolites: [], heldBackBy: ["emulsifier"] },
    ]);
  });
});

describe("stackTotals", () => {
  test("adds supplements as amount per serving × servings to the recipes' totals", () => {
    const out = stackTotals([
      { kind: "recipe", slug: "juice", servings: 2, perServing: [total("vitamin-c", 30, "mg"), total("pectin", null)] },
      { kind: "supplement", slug: "vit-c-1000", servings: 1, compounds: [{ compoundSlug: "vitamin-c", amountPerServing: 1, unit: "g" }] },
    ]);
    expect(out).toEqual([
      {
        compoundSlug: "vitamin-c",
        amount: 1060,
        unit: "mg",
        contributors: [{ itemSlug: "juice", amount: 60 }, { itemSlug: "vit-c-1000", amount: 1000 }],
        missingFrom: [],
      },
      { compoundSlug: "pectin", amount: null, unit: null, contributors: [{ itemSlug: "juice", amount: null }], missingFrom: ["juice"] },
    ]);
  });
});

describe("checkExcess", () => {
  test("compares each total with its upper limit, and says when there is none on file", () => {
    const totals = [
      { compoundSlug: "vitamin-c", amount: 2500, unit: "mg" as const },
      { compoundSlug: "zinc", amount: 30, unit: "mg" as const },
      { compoundSlug: "beta-carotene", amount: 20, unit: "mg" as const },
    ];
    const limits = [
      { compoundSlug: "vitamin-c", amount: 2, unit: "g" as const },
      { compoundSlug: "zinc", amount: 40, unit: "mg" as const },
    ];
    expect(checkExcess(totals, limits)).toEqual([
      { compoundSlug: "vitamin-c", amount: 2500, unit: "mg", upperLimit: { amount: 2, unit: "g" }, status: "over" },
      { compoundSlug: "zinc", amount: 30, unit: "mg", upperLimit: { amount: 40, unit: "mg" }, status: "within" },
      { compoundSlug: "beta-carotene", amount: 20, unit: "mg", upperLimit: null, status: "no upper limit on file" },
    ]);
  });
});

describe("drug interactions", () => {
  test("a fired interaction says to ask a pharmacist or doctor", () => {
    const [flag] = collectCautions(
      [total("vitamin-k1", 400, "µg")],
      [],
      [{ compoundSlug: "vitamin-k1", ingredientSlug: null, kind: "drug-interaction", summary: "Vitamin K counters warfarin", grade: "A" }],
      [],
    );
    expect(flag.advice).toBe("Ask a pharmacist or doctor before combining them.");
  });
});
