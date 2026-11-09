// Every drawing is accounted for: it is worn by USDA foods, or docs/creature-mapping.md says why it cannot be.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { USDA_FOOD_PINS, type UsdaFoodPin } from "../lib/usda/foods.ts";

const drawings = readdirSync("public/art/ingredients").filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4));
const doc = readFileSync("docs/creature-mapping.md", "utf8");
const rows = doc.split("\n").filter((line) => /^\| [a-z0-9-]+ \| (creature list|hand-pinned|name|none) \|/.test(line));
const pins = JSON.parse(readFileSync(USDA_FOOD_PINS, "utf8")) as UsdaFoodPin[];

describe("which USDA foods wear each creature", () => {
  test("every drawing has a row, and every row is a drawing", () => {
    expect(rows.map((r) => r.split(" | ")[0].slice(2)).sort()).toEqual([...drawings].sort());
  });

  test("a drawing with no USDA food says why", () => {
    for (const row of rows.filter((r) => r.includes("| none |"))) expect(row).toMatch(/no USDA SR Legacy food/);
  });

  test("the summary line counts the same rows", () => {
    const [, total] = doc.match(/from the (\d+) drawings/)!;
    expect(Number(total)).toBe(rows.length);
  });

  test("every food dressed by name wears a drawing that exists", () => {
    const named = JSON.parse(readFileSync("tools/art/creature-foods.json", "utf8")) as Record<string, number[]>;
    for (const key of Object.keys(named)) expect(existsSync(`public/art/ingredients/${key}.svg`), key).toBe(true);
    const wear = new Set(Object.values(named).flat());
    for (const pin of pins.filter((p) => wear.has(p.usdaFdcId))) expect(pin.imageUrl.startsWith("/art/ingredients/"), pin.slug).toBe(true);
  });
});
