import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { INGREDIENTS } from "../data/seed/ingredients.ts";

const artFile = (slug: string) => new URL(`../public/art/ingredients/${slug}.svg`, import.meta.url);

describe("every seeded ingredient has its creature art", () => {
  test.each(INGREDIENTS.map((i) => [i.slug, i.name]))("%s", (slug, name) => {
    const file = artFile(slug);
    expect(existsSync(file), `missing public/art/ingredients/${slug}.svg`).toBe(true);
    const svg = readFileSync(file, "utf8");
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain(`<title id="t">${name}</title>`);
    expect(svg).not.toMatch(/<(image|text|script|foreignObject)\b|href=/);
    expect(svg.length).toBeLessThan(4096);
  });
});

// A stand-in is worn by every food of its category without a drawing, red peppers and green ones alike, so its
// creature is a neutral grey that no food's own colour contradicts. Its tile, a background, keeps the category's tint.
describe("every category stand-in is neutral", () => {
  const folder = new URL("../public/art/stand-ins/", import.meta.url);
  const files = readdirSync(folder).filter((f) => f.endsWith(".svg"));

  test("there are stand-ins to check", () => {
    expect(files.length).toBe(21);
  });

  test.each(files)("%s", (file) => {
    const svg = readFileSync(new URL(file, folder), "utf8");
    const body = [...svg.matchAll(/<g stroke="#1B1B1F" stroke-width="6"[^>]*>.*?<\/g>/g)].flatMap((g) => [...g[0].matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]));
    const highlight = [...svg.matchAll(/rx="15" ry="9" fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
    expect(body, "the outlined body").toEqual(["#B5AFA6"]);
    expect(highlight, "the highlight").toEqual(["#D9D4CC"]);
  });
});
