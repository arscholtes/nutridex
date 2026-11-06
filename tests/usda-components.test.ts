// Every component USDA's SR Legacy reports an amount for, checked against the list read from all 7,793 of its records.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { typeColor } from "../lib/art/palette.ts";
import { USDA_NUTRIENTS } from "../lib/usda/nutrients.ts";

type Reported = { id: number; name: string; unit: string; foods: number };

const reported: Reported[] = JSON.parse(readFileSync(new URL("./fixtures/usda-sr-legacy-nutrients.json", import.meta.url), "utf8"));
const mapped = new Map<number, { name: string; unit: string }>(Object.values(USDA_NUTRIENTS).map((n) => [n.id, n]));

// The kcal and µg rows are the same measurements, so these would be a second copy of one fact.
const SAME_MEASUREMENT_IN_ANOTHER_UNIT = [1062, 1104, 1110];

describe("USDA's components", () => {
  test("are all mapped, but for the same measurement in a second unit", () => {
    const missing = reported.filter((r) => !mapped.has(r.id)).map((r) => r.id).sort((a, b) => a - b);
    expect(missing).toEqual(SAME_MEASUREMENT_IN_ANOTHER_UNIT);
  });

  test("keep USDA's own name and unit", () => {
    const differs = reported.filter((r) => mapped.has(r.id) && (mapped.get(r.id)!.name !== r.name || mapped.get(r.id)!.unit !== r.unit));
    expect(differs).toEqual([]);
  });

  test("are never mapped to the same USDA nutrient twice", () => {
    expect(mapped.size).toBe(Object.keys(USDA_NUTRIENTS).length);
  });
});

describe("every compound", () => {
  test("has a class with a colour of its own, so no badge falls back to grey", () => {
    expect(COMPOUNDS.filter((c) => typeColor(c.class) === typeColor(null)).map((c) => c.slug)).toEqual([]);
  });
});
