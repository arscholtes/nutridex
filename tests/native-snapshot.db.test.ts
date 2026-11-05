// The native apps show what the bundled snapshot says, so it must match what the Dex says now.
import { existsSync, readFileSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { inflateRawSync } from "node:zlib";
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { listEntries } from "../lib/db/dex.ts";
import { buildSnapshot, CREATURE_CATALOG, creatureSilhouette, readSnapshotFile, SNAPSHOT_PATH, type NativeSnapshot } from "../lib/native/snapshot.ts";

afterAll(() => sql.end());

const committed = (): NativeSnapshot => readSnapshotFile(SNAPSHOT_PATH);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("the snapshot the native apps bundle", () => {
  test("matches the database; if this fails, run npm run export:native", async () => {
    expect(committed()).toEqual(await buildSnapshot());
  });

  test("carries the app's version, from package.json", () => {
    const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    expect(committed().version).toBe(version);
  });

  test("holds a full entry behind every card", async () => {
    const snapshot = committed();
    const cards = await listEntries({});
    expect(snapshot.cards).toHaveLength(cards.length);
    for (const card of cards) {
      const entries = { ingredient: snapshot.ingredients, compound: snapshot.compounds, effect: snapshot.effects }[card.kind];
      expect(entries[card.slug], card.slug).toBeDefined();
    }
  });

  test("keeps the engine's judgments, so no app has to redo them", () => {
    const carrot = committed().ingredients.carrot;
    expect(carrot.absorption.map((a) => a.flag.status)).toContain("missed");
    expect(carrot.effects.map((e) => e.effect.slug)).toContain("vision");
    expect(carrot.effects.filter((e) => e.compound.slug === "zinc")).toEqual([]);
  });

  test("holds no database ids, which change with every database", () => {
    expect(JSON.stringify(committed())).not.toMatch(UUID);
  });

  test("a source keeps one id wherever it appears", () => {
    const snapshot = committed();
    const fromCarrot = snapshot.ingredients.carrot.effects.find((e) => e.source.title.includes("432/2012"))!.source.id;
    const fromVitaminC = snapshot.compounds["vitamin-c"].effects.find((e) => e.source.title.includes("432/2012"))!.source.id;
    expect(fromCarrot).toBe(fromVitaminC);
  });

  test("has a colour and readable text for every type, and for an untyped entry", () => {
    const { palette, cards } = committed();
    expect(palette.untyped.color).toMatch(/^#[0-9A-F]{6}$/i);
    for (const card of cards) {
      if (card.type) expect(palette.types[card.type], card.type).toMatchObject({ color: expect.stringMatching(/^#/), textOnColor: expect.stringMatching(/^(light|dark)$/) });
    }
  });

  test("tells the truth about what an app stores: a setting, not a cookie", () => {
    const words = JSON.stringify(committed().disclaimer).toLowerCase();
    expect(words).toContain("what is stored about you");
    expect(words).toContain("a setting on this device");
    expect(words).not.toContain("cookie");
  });
});

describe("the file the native apps bundle", () => {
  test("keeps each entry on its own and compressed, so an app opens only what it shows", () => {
    const file = new DatabaseSync(SNAPSHOT_PATH, { readOnly: true });
    const rows = file.prepare("select kind, slug, size, body from entry").all() as { kind: string; slug: string; size: number; body: Uint8Array }[];
    file.close();
    expect(rows).toHaveLength(committed().cards.length);
    for (const row of rows) {
      const json = inflateRawSync(row.body).toString("utf8");
      expect(Buffer.byteLength(json), `${row.kind}:${row.slug}`).toBe(row.size);
      expect(() => JSON.parse(json), `${row.kind}:${row.slug}`).not.toThrow();
    }
  });

  test("is the test database's, small enough to keep in git", () => {
    expect(statSync(SNAPSHOT_PATH).size).toBeLessThan(10 * 1024 * 1024);
  });
});

describe("what a card carries, so an app need not open every entry", () => {
  const entryOf = (snapshot: NativeSnapshot, kind: string, slug: string) =>
    ({ ingredient: snapshot.ingredients, compound: snapshot.compounds, effect: snapshot.effects })[kind as "ingredient"][slug];

  test("the sources behind its entry", () => {
    const snapshot = committed();
    for (const card of snapshot.cards) {
      expect(card.sources, card.slug).toEqual([...new Set(entryOf(snapshot, card.kind, card.slug).sources.map((s) => s.id))]);
    }
  });

  test("a row for every food in the comparison table, with its nutrient panel", () => {
    const snapshot = committed();
    expect(snapshot.compare.map((f) => f.slug).sort()).toEqual(Object.keys(snapshot.ingredients).sort());
    for (const food of snapshot.compare) expect(food.panel, food.slug).toEqual(snapshot.ingredients[food.slug].panel);
  });

  test("what the web's search returns, so the apps can check they rank the same way", async () => {
    const { searchChecks } = committed();
    expect(searchChecks.map((c) => c.query)).toEqual(expect.arrayContaining(["tumeric", "vitamin", "oil"]));
    for (const check of searchChecks) {
      const web = await listEntries({ q: check.query, kind: check.kind ?? undefined });
      expect(check.results, `${check.query} in ${check.kind ?? "everything"}`).toEqual(web.map((c) => `${c.kind}:${c.slug}`));
    }
  });
});

describe("the creature art the native apps bundle", () => {
  test("has an image for every food and compound, and an effect needs none", () => {
    for (const card of committed().cards) {
      if (card.kind === "effect") {
        expect(card.art, card.slug).toBeNull();
        continue;
      }
      expect(existsSync(`${CREATURE_CATALOG}/${card.art}.imageset/${card.art}.svg`), `${card.slug}: ${card.art}`).toBe(true);
    }
  });
});

describe("the silhouettes the Mac app shows for what you have not encountered", () => {
  const art = '<svg viewBox="0 0 256 256">\n  <title id="t">Carrot</title>\n  <rect x="8" y="8" width="240" height="240" rx="40" fill="#E6F4E8"/>\n  <ellipse cx="128" cy="224" rx="50" ry="9" fill="#000" opacity="0.14"/>\n  <g stroke="#1B1B1F"><path d="M1 1"/></g>\n</svg>';

  test("keep the creature and drop its tile and shadow, or the shape would be a black square", () => {
    const shape = creatureSilhouette(art);
    expect(shape).not.toContain('rx="40"');
    expect(shape).not.toContain("<ellipse");
    expect(shape).toContain('<path d="M1 1"/>');
  });

  test("stop loudly on art that has no tile, rather than bundling a square", () => {
    expect(() => creatureSilhouette('<svg><g><path d="M1 1"/></g></svg>')).toThrow(/tile/);
  });

  test("exist for every food and compound", () => {
    for (const card of committed().cards) {
      if (card.kind === "effect") continue;
      const name = `${card.art}-silhouette`;
      expect(existsSync(`${CREATURE_CATALOG}/${name}.imageset/${name}.svg`), name).toBe(true);
    }
  });
});

describe("what each entry says before you have encountered it", () => {
  const description = (kind: string, slug: string) => committed().cards.find((c) => c.kind === kind && c.slug === slug)!.description;

  test("a food says what it is and what it is a source of, and nothing below the bar", () => {
    const carrot = description("ingredient", "carrot");
    expect(carrot).toContain("A vegetable");
    expect(carrot).toContain("A source of");
    expect(carrot).toContain("Vitamin A (RAE)");
    expect(carrot).not.toContain("Zinc");
  });

  test("a food clearing no bar says so", () => {
    expect(description("ingredient", "watermelon")).toContain("No nutrient in it reaches the bar");
  });

  test("a compound names what it does and where it is found", () => {
    const vitaminC = description("compound", "vitamin-c");
    expect(vitaminC).toContain("A vitamin");
    expect(vitaminC).toContain("Immune system");
    expect(vitaminC).toContain("Most in Kale");
  });

  test("a compound with no sourced effect says that rather than guessing", () => {
    expect(description("compound", "retinol")).toContain("No sourced effect on file yet");
  });

  test("an effect names the compounds behind it", () => {
    expect(description("effect", "skin-color")).toContain("Beta-carotene");
  });

  test("every entry has one", () => {
    expect(committed().cards.filter((c) => !c.description)).toEqual([]);
  });
});

describe("what marking a food as had reveals", () => {
  const carrot = () => committed().reveals.carrot;

  test("the compounds it is a real source of, and any it carries that no bar applies to", () => {
    expect(carrot().compounds).toEqual(expect.arrayContaining(["beta-carotene", "vitamin-a"]));
  });

  test("not a trace of something a bar applies to", () => {
    expect(carrot().compounds).not.toContain("zinc");
  });

  test("not the compounds it does not carry", () => {
    expect(carrot().compounds).not.toContain("curcumin");
  });

  test("the effects it clears a bar for, and none it does not", () => {
    expect(carrot().effects).toEqual(expect.arrayContaining(["vision", "skin-color"]));
    expect(carrot().effects).not.toContain("nails");
  });

  test("covers every food", () => {
    const snapshot = committed();
    expect(Object.keys(snapshot.reveals).sort()).toEqual(Object.keys(snapshot.ingredients).sort());
  });
});
