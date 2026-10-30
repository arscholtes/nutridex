import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { compoundAmounts, PANEL, USDA_NUTRIENTS, type FdcFood } from "../lib/usda/nutrients.ts";

const carrots: FdcFood = JSON.parse(
  readFileSync(new URL("./fixtures/fdc-170393-carrots-raw.json", import.meta.url), "utf8"),
);

const bySlug = (food: FdcFood) => new Map(compoundAmounts(food).map((a) => [a.compoundSlug, a]));

describe("compoundAmounts, against USDA's own record for raw carrots (fdcId 170393)", () => {
  test("beta-carotene comes back per 100 g in µg, as USDA reports it", () => {
    expect(bySlug(carrots).get("beta-carotene")).toEqual({
      compoundSlug: "beta-carotene",
      amountPer100g: 8285,
      unit: "µg",
    });
  });

  test("vitamin C keeps its own unit", () => {
    expect(bySlug(carrots).get("vitamin-c")).toMatchObject({ amountPer100g: 5.9, unit: "mg" });
  });

  test("total fat comes back in grams, for the engine's dietary-fat condition", () => {
    expect(bySlug(carrots).get("total-fat")).toMatchObject({ amountPer100g: 0.24, unit: "g" });
  });

  test("total dietary fiber comes back in grams, so juicing's fiber loss has an amount", () => {
    expect(bySlug(carrots).get("dietary-fiber")).toMatchObject({ amountPer100g: 2.8, unit: "g" });
  });

  test("every mapped compound USDA reports for carrots is returned, and nothing else", () => {
    expect([...bySlug(carrots).keys()].sort()).toEqual([
      "alpha-carotene", "beta-carotene", "calcium", "carbohydrate", "choline", "copper", "dietary-fiber", "energy",
      "folate", "iron", "lutein-zeaxanthin", "lycopene", "magnesium", "manganese", "niacin", "pantothenic-acid",
      "phosphorus", "potassium", "protein", "retinol", "riboflavin", "saturated-fat", "selenium", "sodium",
      "thiamin", "total-fat", "total-sugars", "vitamin-a", "vitamin-b12", "vitamin-b6", "vitamin-c", "vitamin-d",
      "vitamin-e", "vitamin-k1", "zinc",
    ]);
  });
});

describe("the nutrient panel", () => {
  test("shows 30 nutrients, each mapped to a USDA nutrient", () => {
    expect(PANEL).toHaveLength(30);
    expect(new Set(PANEL.map((p) => p.slug)).size).toBe(30);
    for (const p of PANEL) expect(USDA_NUTRIENTS).toHaveProperty(p.slug);
  });

  test("maps retinol too, for vitamin A's upper limit, without showing it", () => {
    expect(USDA_NUTRIENTS).toHaveProperty("retinol");
    expect(PANEL.map((p) => p.slug)).not.toContain("retinol");
  });

  test("energy comes back in kcal, as USDA reports it", () => {
    expect(bySlug(carrots).get("energy")).toEqual({ compoundSlug: "energy", amountPer100g: 41, unit: "kcal" });
  });

  test("raw carrots fill every panel cell, measured zeros included", () => {
    const amounts = bySlug(carrots);
    expect(PANEL.filter((p) => !amounts.has(p.slug))).toEqual([]);
    expect(amounts.get("vitamin-b12")).toMatchObject({ amountPer100g: 0, unit: "µg" });
  });
});

describe("compoundAmounts never invents an amount", () => {
  test("a nutrient USDA does not report is absent, not zero", () => {
    const withoutLycopene: FdcFood = {
      ...carrots,
      foodNutrients: carrots.foodNutrients.filter((n) => n.nutrient.id !== 1122),
    };
    expect(bySlug(withoutLycopene).has("lycopene")).toBe(false);
  });

  test("a nutrient entry with no amount is absent, not zero", () => {
    const noAmount: FdcFood = {
      ...carrots,
      foodNutrients: carrots.foodNutrients.map((n) =>
        n.nutrient.id === 1107 ? { nutrient: n.nutrient } : n,
      ),
    };
    expect(bySlug(noAmount).has("beta-carotene")).toBe(false);
  });

  test("a renamed nutrient stops the import instead of storing a number under the wrong compound", () => {
    const renamed: FdcFood = {
      ...carrots,
      foodNutrients: carrots.foodNutrients.map((n) =>
        n.nutrient.id === 1107 ? { ...n, nutrient: { ...n.nutrient, name: "Carotene, gamma" } } : n,
      ),
    };
    expect(() => compoundAmounts(renamed)).toThrow(/1107.*Carotene, gamma/);
  });

  test("a changed unit stops the import", () => {
    const milligrams: FdcFood = {
      ...carrots,
      foodNutrients: carrots.foodNutrients.map((n) =>
        n.nutrient.id === 1107 ? { ...n, nutrient: { ...n.nutrient, unitName: "mg" } } : n,
      ),
    };
    expect(() => compoundAmounts(milligrams)).toThrow(/1107.*mg/);
  });
});
