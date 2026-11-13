// The home database's record of what someone has encountered, and the API every app uploads through.
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { GET, POST } from "../app/api/encounters/route.ts";
import { sql } from "../lib/db/client.ts";
import { catchRows, encounteredFoods, revealedEntries, sourcesBehind } from "../lib/db/encounters.ts";
import { compoundEntry, dexSteps, effectEntry, foodsMatching, ingredientEntry, listEntries, sourceList, type EntryCard } from "../lib/db/dex.ts";
import { scrubCompound, scrubEffect, scrubIngredient } from "../lib/db/reveal.ts";
import { readSnapshotFile, SNAPSHOT_PATH } from "../lib/native/snapshot.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the encounters test writes to the database");
const TOKEN = "test-upload-token";

const post = (body: unknown, token: string | null = TOKEN) =>
  POST(new Request("http://dex.test/api/encounters", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
const get = (token: string | null = TOKEN) => GET(new Request("http://dex.test/api/encounters", { headers: token ? { authorization: `Bearer ${token}` } : {} }));
const clear = () => sql`delete from encounter`;

// These tables are someone's game progress, so what is in them goes back when the tests finish.
let saved: { owned: Record<string, unknown>[]; catches: Record<string, unknown>[] } = { owned: [], catches: [] };

beforeAll(async () => {
  vi.stubEnv("NUTRIDEX_UPLOAD_TOKEN", TOKEN);
  saved = { owned: await sql`select * from encounter`, catches: await sql`select * from catch` };
  await clear();
});
afterEach(clear);
afterAll(async () => {
  vi.unstubAllEnvs();
  await clear();
  if (saved.owned.length > 0) await sql`insert into encounter ${sql(saved.owned)}`;
  if (saved.catches.length > 0) await sql`insert into catch ${sql(saved.catches)}`;
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

  test("keeps the form when an app says it, and refuses one it does not know", async () => {
    expect((await post({ encounters: [{ food: "carrot", encounteredAt: "2026-11-01T12:00:00.000Z", form: "juiced" }] })).status).toBe(200);
    expect(await catchRows()).toEqual([{ food: "carrot", caughtAt: "2026-11-01T12:00:00.000Z", form: "juiced", recipe: null }]);
    expect((await post({ encounters: [{ food: "kale", encounteredAt: "2026-11-01T12:00:00.000Z", form: "fried" }] })).status).toBe(400);
    expect(await encounteredFoods()).toEqual(["carrot"]);
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
    const { reveals } = readSnapshotFile(SNAPSHOT_PATH);
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
    // This database holds 15 foods, so a compound none of them carry waits for the rest.
    const carried = new Set((await sql<{ slug: string }[]>`
      select c.slug from compound c join ingredient_compound ic on ic.compound_id = c.id where ic.amount_per_100g is null or ic.amount_per_100g > 0`).map((c) => c.slug));
    const stuck = cards.filter((c) => (c.kind === "compound" && carried.has(c.slug) && !all.compounds.has(c.slug)) || (c.kind === "effect" && !all.effects.has(c.slug)));
    expect(carried.size).toBeGreaterThan(100);
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
    const cards = await listEntries({ within: r });
    expect(cards.map((c) => c.slug)).toContain("carrot");
    expect(cards.map((c) => c.slug)).not.toContain("kale");
    expect(cards.map((c) => c.slug)).not.toContain("curcumin");
    const beta = cards.find((c) => c.slug === "beta-carotene")!;
    expect(beta.stats.join(" ")).not.toContain("Sweet potato");
    expect(beta.stats.length).toBeGreaterThan(0);
  });

  test("a card names the richest food once you have had it", async () => {
    const r = await revealedEntries(["carrot", "sweet-potato"]);
    const beta = (await listEntries({ within: r })).find((c) => c.slug === "beta-carotene")!;
    expect(beta.stats).toContain("Most in Sweet potato");
  });

  test("a card keeps its number in the whole Dex, not its place among what is unlocked", async () => {
    const whole = await listEntries({ kind: "ingredient" });
    const [carrot] = await listEntries({ kind: "ingredient", within: await revealedEntries(["carrot"]) });
    expect(carrot.number).toBe(whole.find((c) => c.slug === "carrot")!.number);
    expect(carrot.number).not.toBe("F001");
  });

  test("a card reads the same whether or not the list was narrowed, but for naming a hidden food", async () => {
    const r = await revealedEntries(["carrot", "sweet-potato"]);
    const whole = await listEntries({});
    const withoutTop = (c: EntryCard) => ({ ...c, stats: c.stats.filter((s) => !s.startsWith("Most in ")) });
    for (const card of await listEntries({ within: r })) {
      expect(withoutTop(card), card.slug).toEqual(withoutTop(whole.find((c) => c.kind === card.kind && c.slug === card.slug)!));
    }
  });

  test("the foods offered to mark leave out what you have, and say when there are more", async () => {
    const all = await foodsMatching("a", new Set());
    expect(all.foods.length).toBeGreaterThan(3);
    const capped = await foodsMatching("a", new Set(), 2);
    expect(capped.foods).toHaveLength(2);
    expect(capped.more).toBe(true);
    const had = new Set([capped.foods[0].slug]);
    const after = await foodsMatching("a", had, 2);
    expect(after.foods.map((c) => c.slug)).not.toContain(capped.foods[0].slug);
    expect(after.foods).toHaveLength(2);
  });

  test("a food and a compound sharing a slug are unlocked separately", async () => {
    const cards = await listEntries({ within: { foods: new Set(["carrot"]), compounds: new Set(), effects: new Set() } });
    expect(cards.map((c) => c.kind)).toEqual(["ingredient"]);
  });

  test("nothing unlocked lists nothing", async () => {
    expect(await listEntries({ within: await revealedEntries([]) })).toEqual([]);
  });

  test("a list can stop at its best matches", async () => {
    const whole = await listEntries({ q: "carotene" });
    expect(whole.length).toBeGreaterThan(1);
    expect(await listEntries({ q: "carotene", limit: 1 })).toEqual(whole.slice(0, 1));
  });

  test("the steps through a kind hold every entry in number order, whatever is unlocked", async () => {
    const steps = await dexSteps("ingredient");
    expect(steps.map((s) => s.number)).toEqual((await listEntries({ kind: "ingredient" })).map((c) => c.number));
    expect(steps[0]).toMatchObject({ number: "F001", href: `/ingredients/${steps[0].slug}` });
  });

  test("the sources page cites what every unlocked page cites", async () => {
    const r = await revealedEntries(["carrot", "egg"]);
    const behind = new Set(await sourcesBehind(r));
    const steps = { foods: await dexSteps("ingredient"), compounds: await dexSteps("compound"), effects: await dexSteps("effect") };
    const cited = new Set<string>();
    const cites = (value: unknown) => {
      for (const id of JSON.stringify(value).matchAll(/"source":\{"id":"([0-9a-f-]{36})"/g)) cited.add(id[1]);
    };
    for (const slug of r.foods) cites(scrubIngredient((await ingredientEntry(slug))!, r, steps.foods));
    for (const slug of r.compounds) cites(scrubCompound((await compoundEntry(slug))!, r, steps.compounds));
    for (const slug of r.effects) cites(scrubEffect((await effectEntry(slug))!, r, steps.effects));
    expect(cited.size).toBeGreaterThan(0);
    expect([...cited].filter((id) => !behind.has(id))).toEqual([]);
  });

  test("the sources page cites the USDA record behind each food you have had", async () => {
    const [source] = await sql<{ id: string }[]>`select id from source where title like '%Carrots, raw%'`;
    expect(await sourcesBehind(await revealedEntries(["carrot"]))).toContain(source.id);
    expect(await sourcesBehind(await revealedEntries(["kale"]))).not.toContain(source.id);
  });

  test("the sources page cites nothing while nothing is unlocked", async () => {
    expect(await sourcesBehind(await revealedEntries([]))).toEqual([]);
  });

  test("the list of sources can be narrowed to the ones asked for", async () => {
    const ids = await sourcesBehind(await revealedEntries(["carrot"]));
    const listed = await sourceList(sql, ids);
    expect(listed.map((s) => s.id).sort()).toEqual([...ids].sort());
  });

  test("a food's page never names a richer food you have not had", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await dexSteps("ingredient"));
    expect(JSON.stringify(entry)).not.toContain("Sweet potato");
    expect(JSON.stringify(entry)).not.toContain("Canned pumpkin");
    const beta = entry.compounds.find((c) => c.slug === "beta-carotene")!;
    expect(beta.richest).toBeNull();
    expect(beta.share).toBeGreaterThan(0);
  });

  test("a richer food you have had is still named", async () => {
    const r = await revealedEntries(["carrot", "sweet-potato"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await dexSteps("ingredient"));
    expect(entry.compounds.find((c) => c.slug === "beta-carotene")!.richest?.slug).toBe("sweet-potato");
  });

  test("a food's panel does not link a nutrient it has none of", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await dexSteps("ingredient"));
    expect(entry.panel.find((p) => p.slug === "vitamin-d")!.locked).toBe(true);
    expect(entry.panel.find((p) => p.slug === "vitamin-a")!.locked).toBeFalsy();
  });

  test("stepping skips what you have not encountered", async () => {
    const r = await revealedEntries(["beet", "carrot", "watermelon"]);
    const entry = scrubIngredient((await ingredientEntry("carrot"))!, r, await dexSteps("ingredient"));
    expect(entry.pager.prev?.slug).toBe("beet");
    expect(entry.pager.next?.slug).toBe("watermelon");
  });

  test("a compound lists only foods you have had", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubCompound((await compoundEntry("beta-carotene"))!, r, await dexSteps("compound"));
    expect(entry.foods.map((f) => f.slug)).toEqual(["carrot"]);
    expect(JSON.stringify(entry.absent)).not.toContain("Egg");
  });

  test("everything a compound does is reachable once you have unlocked it", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubCompound((await compoundEntry("potassium"))!, r, await dexSteps("compound"));
    expect(entry.effects.length).toBeGreaterThan(0);
    expect(entry.effects.filter((e) => !r.effects.has(e.effect.slug))).toEqual([]);
  });

  test("an effect lists only compounds and foods you have reached", async () => {
    const r = await revealedEntries(["carrot"]);
    const entry = scrubEffect((await effectEntry("immune-system"))!, r, await dexSteps("effect"));
    expect(entry.compounds.map((c) => c.compound.slug)).toContain("vitamin-a");
    expect(JSON.stringify(entry.foods)).not.toContain("Kale");
    for (const group of entry.foods) expect(group.ranked.map((f) => f.slug).filter((s) => s !== "carrot")).toEqual([]);
  });
});
