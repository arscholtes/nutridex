// Compounds have no drawn art yet, so each gets a creature drawn from its data, in the house style
// the drawn ingredients follow (tools/art/STYLE.md).
import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { compoundCreature, creatureSilhouette, foodStandIn } from "../lib/art/creature.ts";
import { typeColor } from "../lib/art/palette.ts";
import { FOOD_CATEGORIES } from "../lib/usda/foods.ts";
import { styleProblems } from "./helpers/art-style.ts";

describe("a food's stand-in, until the food is drawn", () => {
  test.each(FOOD_CATEGORIES.map((c) => [c]))("%s holds to the house style", (category) => {
    expect(styleProblems(foodStandIn(category))).toEqual([]);
  });

  test.each(FOOD_CATEGORIES.map((c) => [c]))("%s has a colour of its own", (category) => {
    expect(typeColor(category)).not.toBe(typeColor(null));
  });

  test("no two categories are drawn the same", () => {
    const drawings = FOOD_CATEGORIES.map((c) => foodStandIn(c).replace(/<title id="t">[^<]*<\/title>/, ""));
    expect(new Set(drawings).size).toBe(FOOD_CATEGORIES.length);
  });

  test("can be blacked out like any other creature", () => {
    expect(creatureSilhouette(foodStandIn("fruit"))).not.toContain('width="240"');
  });
});

describe("a compound's creature", () => {
  test.each(COMPOUNDS.map((c) => [c.slug, c]))("%s holds to the house style", (_, c) => {
    expect(styleProblems(compoundCreature(c))).toEqual([]);
  });

  test("its class sets its colour: two carotenoids share one, a vitamin has another", () => {
    const body = (slug: string) => compoundCreature(COMPOUNDS.find((c) => c.slug === slug)!).match(/<g stroke="#1B1B1F" stroke-width="6"[^>]*>\s*<[a-z]+ [^>]*fill="(#[0-9A-F]{6})"/)?.[1];
    expect(body("beta-carotene")).toBeDefined();
    expect(body("beta-carotene")).toBe(body("lycopene"));
    expect(body("vitamin-c")).not.toBe(body("beta-carotene"));
  });

  test("no two compounds are drawn the same", () => {
    const drawings = COMPOUNDS.map((c) => compoundCreature(c).replace(/<title id="t">[^<]*<\/title>/, ""));
    expect(new Set(drawings).size).toBe(COMPOUNDS.length);
  });

  test("its name is escaped in the title", () => {
    expect(compoundCreature({ slug: "x", name: "A & <B>", class: "vitamin" })).toContain("<title id=\"t\">A &amp; &lt;B&gt;</title>");
  });
});
