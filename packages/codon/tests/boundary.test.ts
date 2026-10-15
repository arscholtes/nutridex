// The package stands alone: it loads nothing outside itself, not even node builtins (it does no
// I/O), and names no food database.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const SRC = new URL("../src/", import.meta.url).pathname;

/** @return [string[]] how a source file crosses the package boundary; empty when it stays inside */
function boundaryProblems(path: string, source: string): string[] {
  const problems: string[] = [];
  // `from "x"` (import and export), `import "x"`, `import("x")` and `require("x")`.
  for (const [, spec] of source.matchAll(/(?:\bfrom\s+|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g)) {
    if (!spec.startsWith(".")) problems.push(`imports a package: ${spec}`);
    else if (!resolve(dirname(path), spec).startsWith(SRC)) problems.push(`imports outside the package: ${spec}`);
  }
  for (const [word] of source.matchAll(/usda|fdc/gi)) problems.push(`names a food database: ${word}`);
  return problems;
}

const files = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts"));

describe("the boundary check itself", () => {
  test("flags an import from the app, a package import, and a USDA name", () => {
    const leaky = 'import { sql } from "../../../lib/db/client.ts";\nimport postgres from "postgres";\nconst fdcId = 170393;';
    expect(boundaryProblems(`${SRC}profile.ts`, leaky)).toEqual([
      "imports outside the package: ../../../lib/db/client.ts",
      "imports a package: postgres",
      "names a food database: fdc",
    ]);
  });

  test("flags every way of loading code: side-effect imports, dynamic import, require, and node builtins", () => {
    const sneaky = 'import "../../../lib/db/client.ts";\nconst db = await import("postgres");\nconst fs = require("node:fs");\nimport { x } from "node:util";';
    expect(boundaryProblems(`${SRC}profile.ts`, sneaky)).toEqual([
      "imports outside the package: ../../../lib/db/client.ts",
      "imports a package: postgres",
      "imports a package: node:fs",
      "imports a package: node:util",
    ]);
  });

  test("passes imports inside the package", () => {
    expect(boundaryProblems(`${SRC}profile.ts`, 'import { expand } from "./expand.ts";\nexport type * from "./types.ts";')).toEqual([]);
  });
});

describe("every source file stays inside the package", () => {
  test("there are source files to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test.each(files)("%s", (file) => {
    expect(boundaryProblems(`${SRC}${file}`, readFileSync(`${SRC}${file}`, "utf8"))).toEqual([]);
  });
});
