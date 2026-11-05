// Which skins exist, what they promise, and what happens to a name nobody knows.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { DEFAULT_SKIN, parseSkin, skinAttributes, skinOf, SKINS, skinVariables } from "../lib/skins.ts";

/** @return [number] the WCAG contrast ratio of two #RRGGBB colours */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("the skins", () => {
  test("are the ones on offer, New age first", () => {
    expect(SKINS.map((s) => s.name)).toEqual(["New age", "Iridescent", "Yellow version", "Nutrition label", "Field guide", "Seed packet", "Sticker book", "Deep sea", "Receipt", "Arcade"]);
  });

  test("start on New age", () => {
    expect(DEFAULT_SKIN).toBe("new-age");
  });

  test.each(SKINS.map((s) => [s.id]))("recognise %s by its id", (id) => {
    expect(parseSkin(id)).toBe(id);
  });

  test.each([["neon"], [""], [null], [undefined], [7]])("refuse %s", (value) => {
    expect(parseSkin(value)).toBeNull();
  });

  test("New age takes its colours and shapes from Apple's website, measured on the page", () => {
    const { colors, radius, nav, hero, font } = skinOf("new-age");
    expect(colors).toMatchObject({ screen: "#FFFFFF", card: "#F5F5F7", ink: "#1D1D1F", inkSoft: "#6E6E73", accent: "#0066CC", night: "#0071E3" });
    expect(radius).toMatchObject({ card: 28, tile: 28, control: "pill" });
    expect({ nav, hero, heading: font.heading }).toEqual({ nav: "text", hero: "title-first", heading: "semibold" });
  });

  test("Iridescent is the one with the foil and the pearly page", () => {
    const { stage, backdrop, card } = skinOf("iridescent");
    expect({ stage, backdrop, card }).toEqual({ stage: "foil", backdrop: "pearl", card: "wash" });
    expect(SKINS.filter((s) => s.stage === "foil").map((s) => s.id)).toEqual(["iridescent"]);
  });

  test("only the Yellow version is the handheld", () => {
    expect(SKINS.filter((s) => s.shell === "handheld").map((s) => s.id)).toEqual(["yellow-version"]);
  });

  test("no two skins share a palette", () => {
    const palettes = SKINS.map((s) => `${s.colors.screen} ${s.colors.ink} ${s.colors.accent}`);
    expect(new Set(palettes).size).toBe(SKINS.length);
  });
});

describe("every skin can be read", () => {
  const readable = 4.5;

  test.each(SKINS.map((s) => [s.id, s.colors] as const))("%s", (_id, c) => {
    const pairs: [string, string, string][] = [
      ["ink on the page", c.ink, c.screen],
      ["ink on a card", c.ink, c.card],
      ["soft ink on the page", c.inkSoft, c.screen],
      ["soft ink on a card", c.inkSoft, c.card],
      ["a main button", c.onNight, c.night],
      ["a large tile", c.onTile, c.tile],
      ["a chosen chip", c.onChip, c.chip],
      ["the upload notice", c.ink, c.notice],
      ["an error", c.danger, c.card],
    ];
    for (const [what, front, back] of pairs) {
      expect(contrast(front, back), `${what}: ${front} on ${back}`).toBeGreaterThanOrEqual(readable);
    }
    // A blacked-out creature has to show as a shape against what is behind it.
    expect(contrast("#000000", c.hidden), `a silhouette on ${c.hidden}`).toBeGreaterThanOrEqual(3);
  });
});

describe("a banner heading", () => {
  test.each(SKINS.filter((s) => s.title === "banner").map((s) => [s.id, s.colors] as const))("can be read on %s", (_id, c) => {
    expect(contrast(c.onNight, c.accent), `${c.onNight} on ${c.accent}`).toBeGreaterThanOrEqual(4.5);
  });
});

describe("what a skin gives the page", () => {
  test("is every colour, as the variables the styles read", () => {
    const variables = skinVariables(skinOf("new-age"));
    expect(variables["--color-ink"]).toBe("#1D1D1F");
    expect(variables["--color-ink-soft"]).toBe("#6E6E73");
    expect(variables["--color-on-night"]).toBe("#FFFFFF");
  });

  test("is its font and how heavy its headings are", () => {
    const variables = skinVariables(skinOf("new-age"));
    expect(variables["--font-sans"]).toContain("-apple-system");
    expect(variables["--font-weight-bold"]).toBe("600");
  });

  test("is its shapes, with a pill as a pill", () => {
    const variables = skinVariables(skinOf("new-age"));
    expect(variables["--radius-card"]).toBe("28px");
    expect(variables["--radius-control"]).toBe("999px");
    expect(skinVariables(skinOf("nutrition-label"))["--radius-control"]).toBe("0px");
  });

  test("is an attribute for each treatment the styles choose between", () => {
    expect(skinAttributes(skinOf("receipt"))).toMatchObject({ "data-skin": "receipt", "data-backdrop": "flat", "data-meter": "segments", "data-title": "dashed", "data-dark": undefined });
    expect(skinAttributes(skinOf("deep-sea"))).toMatchObject({ "data-dark": "true", "data-stage": "glow" });
  });
});

describe("the stylesheets", () => {
  const styles = readdirSync("app")
    .filter((f) => f.endsWith(".css"))
    .map((f) => [f, readFileSync(`app/${f}`, "utf8")] as const);

  test("all reach the page", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    for (const [file] of styles) expect(layout, file).toContain(`./${file}`);
  });

  test.each([
    ["backdrop", "data-backdrop"],
    ["stage", "data-stage"],
    ["card", "data-card"],
    ["meter", "data-meter"],
    ["title", "data-title"],
    ["creature", "data-creature"],
  ] as const)("draw every %s a skin can ask for", (token, attribute) => {
    const css = styles.map(([, text]) => text).join("\n");
    // The first of each is what the plain rules draw, so it needs no attribute of its own.
    const plain = { backdrop: "pearl", stage: "foil", card: "wash", meter: "pill", title: "none", creature: "plain" }[token];
    for (const value of new Set(SKINS.map((s) => s[token]))) {
      if (value === plain) continue;
      expect(css, `${attribute}="${value}"`).toContain(`[${attribute}="${value}"]`);
    }
  });

  test("never change the colour of what they draw, so foods stay true in every skin", () => {
    for (const [file, text] of styles) {
      expect(text, file).not.toMatch(/(?<!backdrop-)filter:[^;]*(hue-rotate|grayscale|sepia|invert|saturate)/);
      expect(text, file).not.toMatch(/mix-blend-mode/);
    }
  });
});
