// The Dex home's search and filters, and the sources page, against a database `npm run seed` has filled.
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { compoundEntry, dexCounts, dexPager, entryTypes, ingredientEntry, listEntries, sourceList } from "../lib/db/dex.ts";

afterAll(() => sql.end());

describe("dex numbers", () => {
  test("a card's number is its place by name within its kind", async () => {
    const cards = await listEntries({});
    const number = (slug: string) => cards.find((c) => c.slug === slug)!.number;
    expect([number("beet"), number("carrot"), number("watermelon"), number("skin-color")]).toEqual(["F001", "F006", "F015", "E001"]);
    expect(number("alpha-carotene")).toMatch(/^C\d{3}$/);
  });

  test("a search keeps each entry's number rather than renumbering what it found", async () => {
    const [carrot] = await listEntries({ q: "carrot", kind: "ingredient" });
    expect(carrot.number).toBe("F006");
  });
});

describe("the dex's counts", () => {
  test("says how many entries each kind holds", async () => {
    expect(await dexCounts()).toEqual({ ingredient: 15, compound: 41, effect: 1 });
  });
});

describe("stepping through the dex", () => {
  test("goes to the neighbours by number, within the entry's kind", async () => {
    expect(await dexPager("ingredient", "carrot")).toEqual({
      number: "F006",
      total: 15,
      prev: { slug: "cantaloupe", name: "Cantaloupe", number: "F005", href: "/ingredients/cantaloupe" },
      next: { slug: "egg", name: "Egg", number: "F007", href: "/ingredients/egg" },
    });
  });

  test("has nothing before the first entry or after the last", async () => {
    expect((await dexPager("ingredient", "beet"))?.prev).toBeNull();
    expect((await dexPager("ingredient", "watermelon"))?.next).toBeNull();
    expect(await dexPager("effect", "skin-color")).toMatchObject({ prev: null, next: null, total: 1 });
  });

  test("returns null for an entry that does not exist", async () => {
    expect(await dexPager("ingredient", "not-a-food")).toBeNull();
  });
});

describe("an entry's measured count", () => {
  test("matches its home card, so the two never disagree", async () => {
    const [card] = await listEntries({ q: "carrot", kind: "ingredient" });
    const entry = (await ingredientEntry("carrot"))!;
    expect(card.stats[0]).toBe(`${entry.measured} compounds measured`);
    expect(entry.measured).toBeGreaterThan(entry.compounds.length);
  });
});

describe("home search", () => {
  test("lists every ingredient, compound and effect when nothing is searched", async () => {
    const cards = await listEntries({});
    const count = (kind: string) => cards.filter((c) => c.kind === kind).length;
    expect([count("ingredient"), count("compound"), count("effect")]).toEqual([15, 41, 1]);
  });

  test('finds turmeric when you type "tumeric", the plan\'s own example', async () => {
    const cards = await listEntries({ q: "tumeric" });
    expect(cards[0]).toMatchObject({ kind: "ingredient", slug: "turmeric", href: "/ingredients/turmeric" });
  });

  test("searches effects too", async () => {
    const cards = await listEntries({ q: "skin" });
    expect(cards.map((c) => c.slug)).toEqual(["skin-color"]);
  });

  test("filters by kind and by type badge", async () => {
    const carotenoids = await listEntries({ kind: "compound", type: "carotenoid" });
    expect(carotenoids.map((c) => c.slug).sort()).toEqual(["alpha-carotene", "beta-carotene", "lutein-zeaxanthin", "lycopene"]);
    const types = await entryTypes();
    expect(types.effect).toEqual(["skin"]);
    expect(types.compound).toContain("carotenoid");
  });

  test("lists ingredients first, then compounds, then effects", async () => {
    const kinds = (await listEntries({})).map((c) => c.kind);
    expect([...new Set(kinds)]).toEqual(["ingredient", "compound", "effect"]);
  });

  test("a compound carried with no measured amount says so, rather than that no food carries it", async () => {
    const piperine = (await listEntries({ q: "piperine" }))[0];
    expect(piperine.stats).toEqual(["In 1 food, no amount measured"]);
    const beta = (await listEntries({ q: "beta-carotene" }))[0];
    expect(beta.stats).toEqual(["In 12 foods", "Most in Sweet potato"]);
  });

  test("a card's evidence badge is its entry's best grade, and none when nothing graded reaches it", async () => {
    const cards = await listEntries({});
    const grade = (slug: string) => cards.find((c) => c.slug === slug)!.bestGrade;
    expect([grade("carrot"), grade("beta-carotene"), grade("skin-color"), grade("piperine")]).toEqual(["B", "B", "B", null]);
  });
});

describe("entries that do not exist", () => {
  test("are null, so the page can answer 404", async () => {
    expect(await ingredientEntry("no-such-food")).toBeNull();
    expect(await compoundEntry("no-such-compound")).toBeNull();
  });
});

describe("the sources page", () => {
  test("names what each source supports and keeps its limitations", async () => {
    const micozzi = (await sourceList()).find((s) => s.pmid === "3421202")!;
    expect(micozzi.supports).toEqual(["Effect: Beta-carotene → Skin color"]);
    expect(micozzi.limitations).toMatch(/men only/);
  });

  test("lists studies before databases", async () => {
    const kinds = (await sourceList()).map((s) => s.studyType === "database");
    expect(kinds.indexOf(true)).toBeGreaterThan(0);
    expect(kinds.slice(kinds.indexOf(true)).every(Boolean)).toBe(true);
  });
});
