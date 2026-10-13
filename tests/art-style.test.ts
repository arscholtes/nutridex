// Every creature in public/art/ingredients holds to the house style in tools/art/STYLE.md.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const DIR = new URL("../public/art/ingredients/", import.meta.url);

/** @return [string[]] how an SVG breaks the house style; empty when it holds */
function styleProblems(svg: string): string[] {
  const problems: string[] = [];
  if (!svg.includes('viewBox="0 0 256 256"')) problems.push("canvas is not 256x256");
  if (!/<title id="t">[^<]+<\/title>/.test(svg)) problems.push("no title");
  if (!/<rect x="8" y="8" width="240" height="240" rx="40" fill="#[0-9A-Fa-f]{6}"\/>/.test(svg)) problems.push("no tile");
  if (/<(image|text|script|foreignObject)\b|href=|<linearGradient|<radialGradient|<filter/.test(svg)) problems.push("forbidden element");
  if ((svg.match(/rx="9\.5" ry="11"/g) ?? []).length !== 2) problems.push("eyes are not the standard pair");
  if ((svg.match(/r="5\.2"/g) ?? []).length !== 2) problems.push("pupils are not the standard pair");
  if (Buffer.byteLength(svg) >= 4096) problems.push("4 KB or larger");
  return problems;
}

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
