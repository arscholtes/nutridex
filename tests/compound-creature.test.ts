// Compounds have no drawn art yet, so each gets a creature drawn from its data, in the house style
// the drawn ingredients follow (tools/art/STYLE.md).
import { describe, expect, test } from "vitest";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { compoundCreature } from "../lib/art/creature.ts";
import { styleProblems } from "./helpers/art-style.ts";

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
