// The native apps show what the bundled snapshot says, so it must match what the Dex says now.
import { existsSync, readFileSync } from "node:fs";
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { listEntries } from "../lib/db/dex.ts";
import { buildSnapshot, CREATURE_CATALOG, creatureAssetName, SNAPSHOT_PATH, type NativeSnapshot } from "../lib/native/snapshot.ts";

afterAll(() => sql.end());

const committed = (): NativeSnapshot => JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
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
    expect(readFileSync(SNAPSHOT_PATH, "utf8")).not.toMatch(UUID);
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

describe("the creature art the native apps bundle", () => {
  test("has an image for every food and compound, and an effect needs none", () => {
    for (const card of committed().cards) {
      if (card.kind === "effect") continue;
      const name = creatureAssetName(card.kind, card.slug);
      expect(existsSync(`${CREATURE_CATALOG}/${name}.imageset/${name}.svg`), name).toBe(true);
    }
  });
});
