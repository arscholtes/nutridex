// The home database's record of what someone has encountered, and the API every app uploads through.
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { GET, POST } from "../app/api/encounters/route.ts";
import { sql } from "../lib/db/client.ts";
import { encounteredFoods, revealedEntries } from "../lib/db/encounters.ts";
import { compoundEntry, effectEntry, ingredientEntry, listEntries } from "../lib/db/dex.ts";
import { scrubCards, scrubCompound, scrubEffect, scrubIngredient } from "../lib/db/reveal.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the encounters test writes to the database");
const TOKEN = "test-upload-token";

const post = (body: unknown, token: string | null = TOKEN) =>
  POST(new Request("http://dex.test/api/encounters", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
const get = (token: string | null = TOKEN) => GET(new Request("http://dex.test/api/encounters", { headers: token ? { authorization: `Bearer ${token}` } : {} }));
const clear = () => sql`delete from encounter`;

beforeAll(() => {
  vi.stubEnv("NUTRIDEX_UPLOAD_TOKEN", TOKEN);
});
afterEach(clear);
afterAll(async () => {
  vi.unstubAllEnvs();
  await clear();
  await sql.end();
});

describe("uploading what you have encountered", () => {
  test("stores the array and says which entries are new", async () => {
    const res = await post({ encounters: [{ food: "carrot", encounteredAt: "2026-11-01T12:00:00.000Z" }, { food: "kale", encounteredAt: "2026-11-02T08:30:00.000Z" }] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.new.sort()).toEqual(["carrot", "kale"]);
    expect(body.encounters.map((e: { food: string }) => e.food).sort()).toEqual(["carrot", "kale"]);
    expect(await encounteredFoods()).toEqual(expect.arrayContaining(["carrot", "kale"]));
  });

  test("uploading the same food twice keeps the first date and is not new again", async () => {
    await post({ encounters: [{ food: "carrot", encounteredAt: "2026-11-01T12:00:00.000Z" }] });
    const res = await post({ encounters: [{ food: "carrot", encounteredAt: "2026-11-05T12:00:00.000Z" }] });
    const body = await res.json();
    expect(body.new).toEqual([]);
    expect(body.encounters[0].encounteredAt).toBe("2026-11-01T12:00:00.000Z");
  });

  test("rejects the whole array if any food is unknown, naming it, and stores nothing", async () => {
    const res = await post({ encounters: [{ food: "carrot", encounteredAt: "2026-11-01T12:00:00.000Z" }, { food: "unicorn-steak", encounteredAt: "2026-11-01T12:00:00.000Z" }] });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("unicorn-steak");
    expect(await encounteredFoods()).toEqual([]);
  });

  test.each([
    ["no array", {}],
    ["not an array", { encounters: "carrot" }],
    ["a bad date", { encounters: [{ food: "carrot", encounteredAt: "yesterday" }] }],
    ["no food", { encounters: [{ encounteredAt: "2026-11-01T12:00:00.000Z" }] }],
  ])("refuses %s", async (_what, body) => {
    expect((await post(body)).status).toBe(400);
  });
});

describe("who may read and write the record", () => {
  test("no token, wrong token: refused both ways", async () => {
    expect((await post({ encounters: [] }, null)).status).toBe(401);
    expect((await post({ encounters: [] }, "wrong")).status).toBe(401);
    expect((await get(null)).status).toBe(401);
  });

  test("a server with no token configured refuses everyone rather than opening up", async () => {
    vi.stubEnv("NUTRIDEX_UPLOAD_TOKEN", "");
    expect((await post({ encounters: [] })).status).toBe(503);
    expect((await get()).status).toBe(503);
    vi.stubEnv("NUTRIDEX_UPLOAD_TOKEN", TOKEN);
  });

  test("reading returns what was uploaded", async () => {
    await post({ encounters: [{ food: "egg", encounteredAt: "2026-11-01T12:00:00.000Z" }] });
    const body = await (await get()).json();
    expect(body.encounters).toEqual([expect.objectContaining({ food: "egg", encounteredAt: "2026-11-01T12:00:00.000Z" })]);
  });
});

describe("what encountering reveals", () => {
  test("nothing at first", async () => {
    const r = await revealedEntries([]);
    expect([r.foods.size, r.compounds.size, r.effects.size]).toEqual([0, 0, 0]);
  });

  test("matches what the native apps bundle, so every platform reveals the same things", async () => {
    const { reveals } = JSON.parse(readFileSync("apple/Shared/Resources/dex.json", "utf8")) as { reveals: Record<string, { compounds: string[]; effects: string[] }> };
    for (const [food, expected] of Object.entries(reveals)) {
      const r = await revealedEntries([food]);
      expect([...r.compounds].sort(), food).toEqual([...expected.compounds].sort());
      expect([...r.effects].sort(), food).toEqual([...expected.effects].sort());
    }
  });
});

describe("the game", () => {
  test("a trace does not unlock a nutrient, and a real source does", async () => {
    const carrot = await revealedEntries(["carrot"]);
    expect(carrot.compounds.has("vitamin-a")).toBe(true);
    expect(carrot.compounds.has("zinc")).toBe(false);
    expect((await revealedEntries(["turmeric"])).compounds.has("zinc")).toBe(true);
  });

  test("a compound no claim sets a bar for unlocks with any amount", async () => {
    expect((await revealedEntries(["carrot"])).compounds.has("beta-carotene")).toBe(true);
    expect((await revealedEntries(["carrot"])).compounds.has("protein")).toBe(true);
  });

  test("the richest food unlocks a nutrient even when no food clears its bar", async () => {
    const { rows } = { rows: await sql<{ slug: string }[]>`
      select i.slug from ingredient_compound ic join ingredient i on i.id = ic.ingredient_id join compound c on c.id = ic.compound_id
      where c.slug = 'thiamin' order by ic.amount_per_100g desc nulls last limit 1` };
    const [{ top }] = await sql<{ top: string }[]>`
      select max(ic.amount_per_100g) as top from ingredient_compound ic join compound c on c.id = ic.compound_id where c.slug = 'thiamin'`;
    expect(Number(top)).toBeLessThan(0.165);
    expect((await revealedEntries([rows[0].slug])).compounds.has("thiamin")).toBe(true);
    expect((await revealedEntries(["watermelon"])).compounds.has("thiamin")).toBe(false);
  });

  test("everything can be unlocked, so the collection can be finished", async () => {
    const foods = (await listEntries({ kind: "ingredient" })).map((c) => c.slug);
    const all = await revealedEntries(foods);
    const cards = await listEntries({});
    const stuck = cards.filter((c) => (c.kind === "compound" && !all.compounds.has(c.slug)) || (c.kind === "effect" && !all.effects.has(c.slug)));
    expect(stuck.map((c) => c.slug)).toEqual([]);
  });

  test("one food does not finish it", async () => {
    const cards = await listEntries({});
    const compounds = cards.filter((c) => c.kind === "compound").length;
    const effects = cards.filter((c) => c.kind === "effect").length;
    for (const food of cards.filter((c) => c.kind === "ingredient")) {
      const r = await revealedEntries([food.slug]);
      expect(r.compounds.size, food.slug).toBeLessThan(compounds);
      expect(r.effects.size, food.slug).toBeLessThan(effects);
    }
  });
});

describe("what someone sees, once hidden things are removed", () => {
  test("the list holds only what is revealed, and no card names a hidden food", async () => {
    const r = await revealedEntries(["carrot"]);
    const cards = scrubCards(await listEntries({}), r);
    expect(cards.map((c) => c.slug)).toContain("carrot");
    expect(cards.map((c) => c.slug)).not.toContain("kale");
    expect(cards.map((c) => c.slug)).not.toContain("curcumin");
    const beta = cards.find((c) => c.slug === "beta-carotene")!;
    expect(beta.stats.join(" ")).not.toContain("Sweet potato");
    expect(beta.stats.length).toBeGreaterThan(0);
  });

  test("a food's page never names a richer food you have not had", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await listEntries({ kind: "ingredient" }));
    expect(JSON.stringify(entry)).not.toContain("Sweet potato");
    expect(JSON.stringify(entry)).not.toContain("Canned pumpkin");
    const beta = entry.compounds.find((c) => c.slug === "beta-carotene")!;
    expect(beta.richest).toBeNull();
    expect(beta.share).toBeGreaterThan(0);
  });

  test("a richer food you have had is still named", async () => {
    const r = await revealedEntries(["carrot", "sweet-potato"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await listEntries({ kind: "ingredient" }));
    expect(entry.compounds.find((c) => c.slug === "beta-carotene")!.richest?.slug).toBe("sweet-potato");
  });

  test("a food's panel does not link a nutrient it has none of", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await listEntries({ kind: "ingredient" }));
    expect(entry.panel.find((p) => p.slug === "vitamin-d")!.locked).toBe(true);
    expect(entry.panel.find((p) => p.slug === "vitamin-a")!.locked).toBeFalsy();
  });

  test("stepping skips what you have not encountered", async () => {
    const r = await revealedEntries(["beet", "carrot", "watermelon"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await listEntries({ kind: "ingredient" }));
    expect(entry.pager.prev?.slug).toBe("beet");
    expect(entry.pager.next?.slug).toBe("watermelon");
  });

  test("a compound lists only foods you have had", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubCompound((await compoundEntry("beta-carotene"))!, r, await listEntries({ kind: "compound" }));
    expect(entry.foods.map((f) => f.slug)).toEqual(["carrot"]);
    expect(JSON.stringify(entry.absent)).not.toContain("Egg");
  });

  test("everything a compound does is reachable once you have unlocked it", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubCompound((await compoundEntry("potassium"))!, r, await listEntries({ kind: "compound" }));
    expect(entry.effects.length).toBeGreaterThan(0);
    expect(entry.effects.filter((e) => !r.effects.has(e.effect.slug))).toEqual([]);
  });

  test("an effect lists only compounds and foods you have reached", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubEffect((await effectEntry("immune-system"))!, r, await listEntries({ kind: "effect" }));
    expect(entry.compounds.map((c) => c.compound.slug)).toContain("vitamin-a");
    expect(JSON.stringify(entry.foods)).not.toContain("Kale");
    for (const group of entry.foods) expect(group.ranked.map((f) => f.slug).filter((s) => s !== "carrot")).toEqual([]);
  });
});
