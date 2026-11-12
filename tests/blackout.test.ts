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
  expect(shape.length).toBeGreaterThan(creatureSilhouette(svg).length - 80);
});

test("a compound's blackout shape drops its name too", () => {
  const svg = compoundCreature({ slug: "beta-carotene", name: "Beta-carotene", class: "carotenoid" });
  expect(svg).toContain("Beta-carotene");
  expect(blackoutShape(svg)).not.toMatch(/beta-carotene/i);
});
