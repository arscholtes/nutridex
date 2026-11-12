// The wall: every entry in number order, blacked out until it is unlocked, and giving nothing away before then.
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, test } from "vitest";
import { WallView } from "../components/wall.tsx";
import { sql } from "../lib/db/client.ts";
import { dexCounts, listEntries, WALL_PAGE, wallPage } from "../lib/db/dex.ts";
import { revealedEntries } from "../lib/db/encounters.ts";

afterAll(() => sql.end());

describe("a page of the wall", () => {
  test("holds the whole Dex in number order, foods first, whatever is unlocked", async () => {
    const totals = await dexCounts();
    const first = await wallPage({ page: 1 });
    expect(first).toHaveLength(WALL_PAGE);
    expect(first[0].number).toBe("F001");
    expect(first.slice(0, totals.ingredient).every((s) => s.kind === "ingredient")).toBe(true);
    expect(first[totals.ingredient].number).toBe("C001");
    const second = await wallPage({ page: 2 });
    expect(second[0].number).toBe(`C${String(WALL_PAGE - totals.ingredient + 1).padStart(3, "0")}`);
  });

  test("ends where the Dex ends", async () => {
    const totals = await dexCounts();
    const all = totals.ingredient + totals.compound + totals.effect;
    const last = Math.ceil(all / WALL_PAGE);
    expect(await wallPage({ page: last })).toHaveLength(all - (last - 1) * WALL_PAGE);
    expect(await wallPage({ page: last + 1 })).toEqual([]);
  });

  test("can be one kind only", async () => {
    const effects = await wallPage({ kind: "effect", page: 1 });
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every((s) => s.kind === "effect")).toBe(true);
    expect(effects[0].number).toBe("E001");
  });
});

describe("what the wall shows someone who has only had a carrot", () => {
  const drawn = async () => {
    const revealed = await revealedEntries(["carrot"]);
    const unlocked = await listEntries({ within: revealed });
    const slots = await wallPage({ kind: "ingredient", page: 1 });
    expect(slots.map((s) => s.slug)).toEqual(expect.arrayContaining(["carrot", "kale"]));
    return { slots, html: renderToStaticMarkup(<WallView slots={slots} unlocked={unlocked} />) };
  };

  test("the carrot in full, as a link", async () => {
    const { html } = await drawn();
    expect(html).toContain("Carrot");
    expect(html).toContain('href="/ingredients/carrot"');
  });

  test("every other food as a number with no name, no type, no link and no address that names it", async () => {
    const { slots, html } = await drawn();
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["/ingredients/carrot"]);
    for (const slot of slots.filter((s) => s.slug !== "carrot")) {
      expect(html, slot.slug).toContain(slot.number);
      expect(html.toLowerCase(), slot.slug).not.toContain(slot.name.toLowerCase());
      expect(html, slot.slug).not.toContain(slot.slug);
    }
    expect(html).not.toMatch(/src="\/art\//);
  });
});
