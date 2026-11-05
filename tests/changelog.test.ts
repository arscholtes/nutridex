// The changelog keeps up with the version: bumping package.json without writing the entry fails here.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const changelog = readFileSync("CHANGELOG.md", "utf8");
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
const entries = changelog.split(/^## /m).slice(1);
const released = entries.filter((entry) => !entry.startsWith("Unreleased"));
const versionOf = (entry: string) => entry.split(" ")[0];

describe("CHANGELOG.md", () => {
  test("its newest version is the one package.json runs", () => {
    expect(versionOf(released[0])).toBe(version);
  });

  test("every version has one entry, newest first, in the form 1.2.3 - YYYY-MM-DD", () => {
    for (const entry of released) expect(entry.split("\n")[0]).toMatch(/^\d+\.\d+\.\d+ - \d{4}-\d{2}-\d{2}$/);
    const versions = released.map(versionOf);
    const newestFirst = [...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    expect(versions).toEqual(newestFirst);
    expect(new Set(versions).size).toBe(versions.length);
  });

  test("every version says what changed", () => {
    for (const entry of released) expect(entry).toMatch(/^- /m);
  });
});
