import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import config from "../next.config.ts";

const traced = (config.outputFileTracingIncludes?.["/**"] ?? []).map((glob) => glob.replace(/^\.\/public/, "").replace(/\*\*$/, ""));

test("every page's server function is given files to read from disk", () => {
  expect(traced.length).toBeGreaterThan(0);
});

test("every drawing a seeded food points at ships with the server function, which reads it from disk", () => {
  const foods = JSON.parse(readFileSync(new URL("../data/seed/usda-foods.json", import.meta.url), "utf8")) as { slug: string; imageUrl: string }[];
  const left = foods.filter((f) => !traced.some((folder) => f.imageUrl.startsWith(folder)));
  expect(left.length, `${left.length} foods, such as ${left[0]?.slug} at ${left[0]?.imageUrl}`).toBe(0);
});
