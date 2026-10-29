// Every creature in public/art/ingredients holds to the house style in tools/art/STYLE.md.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { styleProblems } from "./helpers/art-style.ts";

const DIR = new URL("../public/art/ingredients/", import.meta.url);

const files = readdirSync(DIR).filter((f) => f.endsWith(".svg")).sort();

describe("the style check itself", () => {
  test("flags a drawing that breaks the style", () => {
    const broken = '<svg viewBox="0 0 100 100"><text>hi</text><ellipse rx="9.5" ry="11"/></svg>';
    expect(styleProblems(broken)).toEqual(
      expect.arrayContaining(["canvas is not 256x256", "no title", "no tile", "forbidden element", "eyes are not the standard pair"]),
    );
  });

  test("passes the approved carrot", () => {
    expect(styleProblems(readFileSync(new URL("carrot.svg", DIR), "utf8"))).toEqual([]);
  });
});

describe("every creature holds to the house style", () => {
  test("there are creatures to check", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  test.each(files)("%s", (file) => {
    expect(styleProblems(readFileSync(new URL(file, DIR), "utf8"))).toEqual([]);
  });
});
