import { describe, expect, test } from "vitest";
import { convert } from "../src/units.ts";

describe("convert", () => {
  test("converts between masses", () => {
    expect(convert(1, "g", "mg")).toBe(1000);
    expect(convert(2500, "µg", "mg")).toBe(2.5);
  });

  test("leaves energy in kcal as it is", () => {
    expect(convert(250, "kcal", "kcal")).toBe(250);
  });

  test("refuses to turn energy into a mass, or a mass into energy", () => {
    expect(() => convert(100, "kcal", "g")).toThrow("can't convert kcal to g");
    expect(() => convert(1, "mg", "kcal")).toThrow("can't convert mg to kcal");
  });
});
