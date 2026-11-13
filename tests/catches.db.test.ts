// Someone owns a food once, and every time they have it is a catch of its own.
import { afterAll, afterEach, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { catchRows, encounterRows, foodHistories, recordEncounters } from "../lib/db/encounters.ts";
import { eraseOwner, ownerRecord } from "../lib/db/sessions.ts";
import { tierOf } from "../lib/tiers.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the catches test writes to the database");

const DEE = "44444444-4444-4444-8444-444444444444";
const ELI = "55555555-5555-4555-8555-555555555555";
const day = (n: number) => `2026-11-${String(n).padStart(2, "0")}T12:00:00.000Z`;

afterEach(() => sql`delete from encounter where owner_id in (${DEE}, ${ELI})`);
afterAll(() => sql.end());

describe("having a food", () => {
  test("the first time owns it and is a catch", async () => {
    expect((await recordEncounters([{ food: "carrot", encounteredAt: day(1), form: "raw" }], DEE)).added).toEqual(["carrot"]);
    expect(await catchRows(DEE)).toEqual([{ food: "carrot", caughtAt: day(1), form: "raw", recipe: null }]);
  });

  test("again is another catch of the same food, and not a new food", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: day(1) }], DEE);
    expect((await recordEncounters([{ food: "carrot", encounteredAt: day(2), form: "juiced" }], DEE)).added).toEqual([]);
    expect((await encounterRows(DEE)).map((e) => e.food)).toEqual(["carrot"]);
    expect((await catchRows(DEE)).map((c) => [c.caughtAt, c.form])).toEqual([[day(1), null], [day(2), "juiced"]]);
  });

  test("sent twice, as an app does when its upload is retried, is stored once", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: day(1) }], DEE);
    await recordEncounters([{ food: "carrot", encounteredAt: day(1) }], DEE);
    expect(await catchRows(DEE)).toHaveLength(1);
  });

  test("an earlier catch arriving late moves the day the food was first had", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: day(5) }], DEE);
    await recordEncounters([{ food: "carrot", encounteredAt: day(2) }], DEE);
    expect((await encounterRows(DEE))[0].encounteredAt).toBe(day(2));
  });

  test("is each person's own", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: day(1) }, { food: "carrot", encounteredAt: day(2) }], DEE);
    await recordEncounters([{ food: "carrot", encounteredAt: day(3) }], ELI);
    expect(await catchRows(DEE)).toHaveLength(2);
    expect(await catchRows(ELI)).toHaveLength(1);
  });

  test("an unknown food stores nothing, catches included", async () => {
    expect((await recordEncounters([{ food: "carrot", encounteredAt: day(1) }, { food: "moon-rock", encounteredAt: day(1) }], DEE)).unknown).toEqual(["moon-rock"]);
    expect(await catchRows(DEE)).toEqual([]);
  });
});

describe("having a food in a recipe", () => {
  test("keeps which recipe, and counts as cooking it once", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: day(1), form: "juiced", recipe: "juice" }], DEE);
    expect(await catchRows(DEE)).toEqual([{ food: "carrot", caughtAt: day(1), form: "juiced", recipe: "juice" }]);
    const carrot = (await foodHistories(DEE)).get("carrot")!;
    expect(carrot).toMatchObject({ catches: 1, cooked: 1, recipes: 1 });
    expect(tierOf(carrot)).toBe(2);
  });

  test("stores nothing when the food is not in that recipe", async () => {
    const result = await recordEncounters([{ food: "kale", encounteredAt: day(1) }, { food: "egg", encounteredAt: day(1), recipe: "juice" }], DEE);
    expect(result.misplaced).toEqual(["egg in juice"]);
    expect(await catchRows(DEE)).toEqual([]);
  });

  test("stores nothing when there is no such recipe", async () => {
    expect((await recordEncounters([{ food: "carrot", encounteredAt: day(1), recipe: "moon-soup" }], DEE)).misplaced).toEqual(["carrot in moon-soup"]);
    expect(await catchRows(DEE)).toEqual([]);
  });

  test("cannot name a recipe that is someone else's", async () => {
    const [juice] = await sql<{ id: string }[]>`select id from recipe where slug = 'juice'`;
    const [theirs] = await sql<{ id: string }[]>`insert into recipe (slug, name, servings, owner_id) values ('elis-secret', 'Secret', 1, ${ELI}) returning id`;
    try {
      await sql`insert into recipe_ingredient (recipe_id, ingredient_id, grams) select ${theirs.id}, ingredient_id, grams from recipe_ingredient where recipe_id = ${juice.id}`;
      expect((await recordEncounters([{ food: "carrot", encounteredAt: day(1), recipe: "elis-secret" }], DEE)).misplaced).toEqual(["carrot in elis-secret"]);
      expect((await recordEncounters([{ food: "carrot", encounteredAt: day(1), recipe: "elis-secret" }], ELI)).misplaced).toEqual([]);
    } finally {
      await sql`delete from recipe where id = ${theirs.id}`;
    }
  });
});

describe("what someone has done with each food", () => {
  test("counts its catches and forms, which is what its tier is worked out from", async () => {
    await recordEncounters(
      [
        { food: "carrot", encounteredAt: day(1), form: "raw" },
        { food: "carrot", encounteredAt: day(2), form: "raw" },
        { food: "carrot", encounteredAt: day(3), form: "juiced" },
        { food: "kale", encounteredAt: day(3) },
      ],
      DEE,
    );
    const histories = await foodHistories(DEE);
    expect(histories.get("carrot")).toEqual({ catches: 3, forms: 2, cooked: 0, recipes: 0, sourcesOpened: 0 });
    expect(histories.get("kale")).toEqual({ catches: 1, forms: 0, cooked: 0, recipes: 0, sourcesOpened: 0 });
    expect(tierOf(histories.get("carrot")!)).toBe(2);
    expect(tierOf(histories.get("kale")!)).toBe(1);
  });
});

describe("someone's own data", () => {
  test("holds every catch when taken out, and none are left when the account is deleted", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: day(1), form: "raw" }, { food: "carrot", encounteredAt: day(2) }], DEE);
    await recordEncounters([{ food: "kale", encounteredAt: day(1) }], ELI);
    expect((await ownerRecord(DEE)).catches).toEqual([
      { food: "carrot", caughtAt: day(1), form: "raw", recipe: null },
      { food: "carrot", caughtAt: day(2), form: null, recipe: null },
    ]);
    await eraseOwner(DEE);
    expect(await catchRows(DEE)).toEqual([]);
    expect((await sql`select count(*)::int as n from catch c join encounter e on e.id = c.encounter_id where e.owner_id = ${DEE}`)[0].n).toBe(0);
    expect(await catchRows(ELI)).toHaveLength(1);
  });
});
