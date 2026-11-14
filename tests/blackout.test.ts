// A locked card shows a creature's shape and nothing that names it.
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { blackoutShape, compoundCreature, creatureSilhouette } from "../lib/art/creature.ts";

test("a drawn food's blackout shape keeps its outline and drops its name", () => {
  const svg = readFileSync("public/art/ingredients/carrot.svg", "utf8");
  expect(svg).toMatch(/carrot/i);
  const shape = blackoutShape(svg);
  expect(shape).not.toMatch(/carrot/i);
  expect(shape).not.toContain("<title");
  const outline = (art: string) => [...art.matchAll(/ d="([^"]*)"/g)].map((m) => m[1]);
  expect(outline(shape).length).toBeGreaterThan(3);
  expect(outline(shape)).toEqual(outline(creatureSilhouette(svg)));
});

test("a compound's blackout shape drops its name too", () => {
  const svg = compoundCreature({ slug: "beta-carotene", name: "Beta-carotene", class: "carotenoid" });
  expect(svg).toContain("Beta-carotene");
  expect(blackoutShape(svg)).not.toMatch(/beta-carotene/i);
});

const coloursIn = (svg: string) => [...svg.matchAll(/\b(?:fill|stroke)="([^"]*)"/g)].map((m) => m[1]);

test("a blackout shape carries no colour of the creature's, so the page's source cannot give one away", () => {
  const food = readFileSync("public/art/ingredients/carrot.svg", "utf8");
  const compound = compoundCreature({ slug: "beta-carotene", name: "Beta-carotene", class: "carotenoid" });
  for (const svg of [food, compound]) {
    expect(coloursIn(svg).some((c) => c !== "none" && c !== "#000")).toBe(true);
    const shape = blackoutShape(svg);
    expect(coloursIn(shape).length).toBeGreaterThan(5);
    expect(coloursIn(shape).filter((c) => c !== "none" && c !== "#000")).toEqual([]);
    expect(shape).not.toMatch(/#[0-9a-f]{6}/i);
  }
});
