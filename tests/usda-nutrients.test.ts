import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { compoundAmounts, type FdcFood } from "../lib/usda/nutrients.ts";

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

  test("every mapped compound USDA reports for carrots is returned, and nothing else", () => {
    expect([...bySlug(carrots).keys()].sort()).toEqual(
      ["alpha-carotene", "beta-carotene", "lutein-zeaxanthin", "lycopene", "vitamin-c", "vitamin-k1"],
    );
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
