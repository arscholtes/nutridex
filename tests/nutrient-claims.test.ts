// The nutrient claims against the law they quote: fixtures hold the text of each annex as published.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { PANEL_COMPOUNDS } from "../lib/usda/nutrients.ts";
import { COMPOUND_EFFECTS, EFFECTS, SOURCES } from "../data/seed/facts.ts";
import { CHOLINE_BAR_PER_100G, NUTRIENT_CLAIMS, NUTRIENT_SOURCE, REFERENCE_VALUES, sourceBar } from "../data/seed/nutrient-claims.ts";
import { typeColor } from "../lib/art/palette.ts";
import { USDA_NUTRIENTS } from "../lib/usda/nutrients.ts";

const annex = readFileSync("tests/fixtures/uk-432-2012-annex.txt", "utf8");
const referenceValues = readFileSync("tests/fixtures/uk-1169-2011-annex-xiii-part-a.txt", "utf8");
const claims = NUTRIENT_CLAIMS.flatMap((n) => n.claims);

/** @return [string] a number as the annex prints it: "1,1", "2 000" */
const asPrinted = (n: number) => String(n).replace(".", ",").replace(/^(\d)(\d{3})$/, "$1 $2");

describe("the regulation's own words", () => {
  test("the fixture really holds the annex", () => {
    expect(annex).toContain("Vitamin C contributes to the normal function of the immune system");
    expect(annex.length).toBeGreaterThan(20_000);
  });

  test("every claim appears in it word for word", () => {
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.filter((c) => !annex.includes(c))).toEqual([]);
  });

  test("each of the 150 claims is used once", () => {
    expect(claims).toHaveLength(150);
    expect(new Set(claims).size).toBe(150);
  });

  test("a compound's claims under one effect stay separate sentences in its summary", () => {
    const zinc = COMPOUND_EFFECTS.find((ce) => ce.compound === "zinc" && ce.effect === "metabolism")!;
    expect(zinc.summary).toContain("Zinc contributes to normal carbohydrate metabolism.");
    expect(zinc.summary).toContain("Zinc contributes to normal protein synthesis.");
  });
});

describe("which nutrients it covers", () => {
  const covered = new Set(NUTRIENT_CLAIMS.map((n) => n.compound));

  test("every vitamin and mineral on the panel has claims, except the two the regulation gives none to use", () => {
    const inScope = COMPOUNDS.filter((c) => (c.class === "vitamin" || c.class === "mineral") && PANEL_COMPOUNDS.includes(c.slug)).map((c) => c.slug);
    expect(inScope).toHaveLength(23);
    expect(inScope.filter((slug) => !covered.has(slug)).sort()).toEqual(["retinol", "sodium"]);
  });

  test("choline, which the panel shows beside the vitamins, has its claims too", () => {
    expect(covered.has("choline")).toBe(true);
  });

  test("leaves out the vitamin C claim that rests on a daily dose rather than on food", () => {
    expect(annex).toContain("during and after intense physical exercise");
    expect(claims.filter((c) => c.includes("intense physical exercise"))).toEqual([]);
  });
});

describe("the bar a food must clear", () => {
  test("each reference value is the one the annex prints", () => {
    for (const r of Object.values(REFERENCE_VALUES)) {
      const printed = new RegExp(`${r.label}\\s*\\(${r.unit.replace("µ", "μ")}\\) ${asPrinted(r.amount)}(?![\\d,])`);
      expect(referenceValues, r.label).toMatch(printed);
    }
  });

  test("the annex sets a significant amount at 15% per 100 g", () => {
    expect(referenceValues).toContain("15 % of the nutrient reference values specified in point 1 supplied by 100 g");
  });

  test("a nutrient's bar is 15% of its reference value, in the unit USDA reports it in", () => {
    expect(sourceBar("vitamin-c")).toBeCloseTo(12, 6);
    expect(sourceBar("thiamin")).toBeCloseTo(0.165, 6);
    expect(sourceBar("potassium")).toBeCloseTo(300, 6);
    for (const [slug, r] of Object.entries(REFERENCE_VALUES)) {
      expect(USDA_NUTRIENTS[slug as keyof typeof USDA_NUTRIENTS].unit, slug).toBe(r.unit);
    }
  });

  test("choline's bar is the amount its own claims state", () => {
    expect(annex).toContain("at least 82,5 mg of choline per 100 g");
    expect(CHOLINE_BAR_PER_100G).toBe(82.5);
  });

  test("every nutrient claim in the seed carries its bar, and says it in words", () => {
    const fromClaims = COMPOUND_EFFECTS.filter((ce) => ce.source === NUTRIENT_SOURCE.key);
    expect(fromClaims.length).toBeGreaterThan(0);
    expect(fromClaims.filter((ce) => ce.minFoodPer100g === null || !ce.doseContext?.includes("per 100 g"))).toEqual([]);
  });
});

describe("how the seed takes them in", () => {
  test("the source and every effect are seeded, and every effect is used", () => {
    expect(SOURCES.map((s) => s.key)).toContain(NUTRIENT_SOURCE.key);
    const used = new Set(COMPOUND_EFFECTS.map((ce) => ce.effect));
    expect(EFFECTS.filter((e) => !used.has(e.slug))).toEqual([]);
    expect(EFFECTS).toHaveLength(29);
  });

  test("one row per compound and effect, which is what the seed matches on", () => {
    const keys = COMPOUND_EFFECTS.map((ce) => `${ce.compound}:${ce.effect}:${ce.source}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every effect's body system has a colour of its own, not the grey for an unlisted type", () => {
    expect(EFFECTS.filter((e) => typeColor(e.bodySystem) === typeColor(null))).toEqual([]);
  });
});
