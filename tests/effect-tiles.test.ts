// How a food's effects become tiles: the more of your daily amount behind an effect, the more it shows.
import { describe, expect, test } from "vitest";
import { bentoTiles, dailyShare } from "../lib/db/effect-tiles.ts";

const source = { id: "eu", title: "The regulation", url: null, year: 2012, studyType: "regulatory review", limitations: null };
const claim = (effect: string, compound: string, bar: number | null, over: { grade?: "A" | "B" | "C" | "D"; direction?: string; dose?: string } = {}) => ({
  effect: { slug: effect, name: effect.toUpperCase(), direction: over.direction ?? "benefit", bodySystem: null },
  compound: { slug: compound, name: compound.toUpperCase(), class: "vitamin" },
  summary: `${compound} helps ${effect}.`,
  doseContext: over.dose ?? null,
  onset: null,
  minFoodPer100g: bar,
  grade: over.grade ?? ("B" as const),
  source,
});
const amounts = (entries: Record<string, number | null>) => new Map(Object.entries(entries).map(([slug, amount]) => [slug, { amount, unit: "mg" as const }]));

describe("a nutrient's daily share", () => {
  test("is the amount over the reference value its bar is 15% of", () => {
    // Vitamin C: the bar is 12 mg, so the reference value is 80 mg.
    expect(dailyShare(40, 12)).toBeCloseTo(0.5);
  });

  test("is unknown where a claim sets no bar, rather than guessed", () => {
    expect(dailyShare(40, null)).toBeNull();
  });

  test("is unknown where USDA has no amount, rather than zero", () => {
    expect(dailyShare(null, 12)).toBeNull();
  });
});

describe("a food's tiles", () => {
  test("one per effect, naming every nutrient behind it, most of your daily amount first", () => {
    const [tile, ...others] = bentoTiles([claim("immune", "a", 120), claim("immune", "c", 12)], amounts({ a: 240, c: 60 }));
    expect(others).toEqual([]);
    expect(tile.compounds.map((c) => c.slug)).toEqual(["c", "a"]);
    expect(tile.compounds.map((c) => Math.round(c.dailyShare! * 100))).toEqual([75, 30]);
    expect(tile.topShare).toBeCloseTo(0.75);
  });

  test("the effect with the most of your daily amount behind it comes first", () => {
    const tiles = bentoTiles([claim("low", "a", 12), claim("high", "b", 12)], amounts({ a: 20, b: 60 }));
    expect(tiles.map((t) => t.effect.slug)).toEqual(["high", "low"]);
  });

  test("a full day's worth earns the large tile", () => {
    expect(bentoTiles([claim("a", "x", 12)], amounts({ x: 90 }))[0].size).toBe("large");
  });

  test("a good share earns a wide tile, and the bar alone a small one", () => {
    const tiles = bentoTiles([claim("mid", "x", 12), claim("low", "y", 12)], amounts({ x: 40, y: 14 }));
    expect(tiles.map((t) => t.size)).toEqual(["wide", "small"]);
  });

  test("only one tile is large, and only a few are wide, or size would stop meaning anything", () => {
    const nutrients = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const tiles = bentoTiles(nutrients.map((n) => claim(`does-${n}`, n, 12)), amounts(Object.fromEntries(nutrients.map((n) => [n, 200]))));
    expect(tiles.filter((t) => t.size === "large")).toHaveLength(1);
    expect(tiles.filter((t) => t.size === "wide")).toHaveLength(3);
    expect(tiles.filter((t) => t.size === "small")).toHaveLength(4);
  });

  test("a nutrient headlines one big tile, so the same number never fills the grid", () => {
    const tiles = bentoTiles(["a", "b", "c", "d"].map((e) => claim(e, "x", 12)), amounts({ x: 200 }));
    expect(tiles.map((t) => t.size)).toEqual(["large", "small", "small", "small"]);
  });

  test("the next nutrient along still gets its big tile", () => {
    const tiles = bentoTiles([claim("a", "x", 12), claim("b", "x", 12), claim("c", "y", 12)], amounts({ x: 200, y: 60 }));
    expect(tiles.find((t) => t.effect.slug === "c")?.size).toBe("wide");
  });

  test("the same few tiles lead on every read, whatever order the claims arrive in", () => {
    const claims = [claim("b", "x", 12), claim("a", "x", 12)];
    const names = (list: typeof claims) => bentoTiles(list, amounts({ x: 100 })).map((t) => t.effect.slug);
    expect(names(claims)).toEqual(names([...claims].reverse()));
  });

  test("a claim with no bar still shows, small and with no percentage", () => {
    const [tile] = bentoTiles([claim("skin", "beta", null, { direction: "neutral" })], amounts({ beta: 8285 }));
    expect(tile).toMatchObject({ size: "small", topShare: null, effect: { direction: "neutral" } });
    expect(tile.compounds[0].dailyShare).toBeNull();
  });

  test("a claim resting on a trial says what dose the trial used, with the room to say it", () => {
    const [tile] = bentoTiles([claim("skin", "beta", null, { dose: "30 mg a day" })], amounts({ beta: 8285 }));
    expect(tile).toMatchObject({ size: "wide", dose: "30 mg a day", topShare: null });
  });

  test("a food's own bar is never called a trial dose", () => {
    const [tile] = bentoTiles([claim("immune", "c", 12, { dose: "A food qualifies at 12 mg per 100 g or more." })], amounts({ c: 14 }));
    expect(tile.dose).toBeNull();
  });

  test("a tile carries its best grade and the wording behind its leading nutrient", () => {
    const [tile] = bentoTiles([claim("immune", "a", 12, { grade: "C" }), claim("immune", "c", 12, { grade: "B" })], amounts({ a: 12, c: 60 }));
    expect(tile.grade).toBe("B");
    expect(tile.wording).toBe("c helps immune.");
  });
});
