// Every creature in public/art/ingredients holds to the house style in tools/art/STYLE.md.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { styleProblems } from "./helpers/art-style.ts";

const DIR = new URL("../public/art/ingredients/", import.meta.url);

const files = readdirSync(DIR).filter((f) => f.endsWith(".svg")).sort();

describe("the style check itself", () => {
  test("flags a drawing that breaks the rules", () => {
    const broken = '<svg viewBox="0 0 100 100"><text>hi</text><ellipse rx="9.5" ry="11"/></svg>';
    expect(styleProblems(broken)).toEqual(
      expect.arrayContaining(["canvas is not 256x256", "no title", "no tile", "forbidden element"]),
    );
  });

  test("flags a reference to anything outside the file", () => {
    const external = '<svg viewBox="0 0 256 256"><title id="t">x</title><rect x="8" y="8" width="240" height="240" rx="40" fill="#FFFFFF"/><use href="https://example.com/a.svg#b"/></svg>';
    expect(styleProblems(external)).toEqual(["external reference"]);
  });

  test("allows shading, a face of any kind, reuse within the file, and a larger file", () => {
    const shaded =
      '<svg viewBox="0 0 256 256"><title id="t">x</title><rect x="8" y="8" width="240" height="240" rx="40" fill="#FFFFFF"/>' +
      '<defs><radialGradient id="g"/><filter id="f"/><path id="leaf"/></defs><circle fill="url(#g)" filter="url(#f)"/><use href="#leaf"/>' +
      "<!-- " + "x".repeat(5000) + " -->" +
      "</svg>";
    expect(styleProblems(shaded)).toEqual([]);
  });

  test("still refuses a file too big to ship by the hundred", () => {
    const huge = '<svg viewBox="0 0 256 256"><title id="t">x</title><rect x="8" y="8" width="240" height="240" rx="40" fill="#FFFFFF"/><!-- ' + "x".repeat(16384) + " --></svg>";
    expect(styleProblems(huge)).toEqual(["16 KB or larger"]);
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
