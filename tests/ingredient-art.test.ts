import { existsSync, readFileSync } from "node:fs";
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
