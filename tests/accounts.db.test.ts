// Each signed-in person's record is their own: encounters, the skin, and the sessions that prove who they are.
import { afterAll, afterEach, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { encounteredFoods, recordEncounters } from "../lib/db/encounters.ts";
import { savedSkin, saveSkin } from "../lib/db/preferences.ts";
import { endSession, eraseOwner, ownerRecord, sessionFor, startSession } from "../lib/db/sessions.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the accounts test writes to the database");

const ANA = "11111111-1111-4111-8111-111111111111";
const BO = "22222222-2222-4222-8222-222222222222";
const at = "2026-11-12T12:00:00.000Z";

const clear = async () => {
  await sql`delete from encounter where owner_id in (${ANA}, ${BO})`;
  await sql`delete from preference where owner_id in (${ANA}, ${BO})`;
  await sql`delete from session where owner_id in (${ANA}, ${BO})`;
};
afterEach(clear);
afterAll(() => sql.end());

describe("two accounts", () => {
  test("do not see each other's unlocks, and neither shows in the record the apps share", async () => {
    const shared = await encounteredFoods();
    expect((await recordEncounters([{ food: "carrot", encounteredAt: at }], ANA)).added).toEqual(["carrot"]);
    expect((await recordEncounters([{ food: "kale", encounteredAt: at }], BO)).added).toEqual(["kale"]);
    expect(await encounteredFoods(ANA)).toEqual(["carrot"]);
    expect(await encounteredFoods(BO)).toEqual(["kale"]);
    expect(await encounteredFoods()).toEqual(shared);
  });

  test("can both have had the same food, and one person's second time is not new", async () => {
    expect((await recordEncounters([{ food: "carrot", encounteredAt: at }], ANA)).added).toEqual(["carrot"]);
    expect((await recordEncounters([{ food: "carrot", encounteredAt: at }], BO)).added).toEqual(["carrot"]);
    expect((await recordEncounters([{ food: "carrot", encounteredAt: at }], ANA)).added).toEqual([]);
  });

  test("each keep their own skin, and the last choice wins", async () => {
    const shared = await savedSkin();
    await saveSkin("deep-sea", ANA);
    await saveSkin("receipt", BO);
    await saveSkin("arcade", ANA);
    expect(await savedSkin(ANA)).toBe("arcade");
    expect(await savedSkin(BO)).toBe("receipt");
    expect(await savedSkin()).toBe(shared);
  });
});

describe("a session", () => {
  test("names its owner and the email it was proven with, until it is ended", async () => {
    const token = await startSession(ANA, "ana@example.com");
    expect(await sessionFor(token)).toEqual({ owner: ANA, email: "ana@example.com" });
    await endSession(token);
    expect(await sessionFor(token)).toBeNull();
  });

  test("is not found by a token nobody was given, and the token itself is never stored", async () => {
    const token = await startSession(ANA, "ana@example.com");
    expect(await sessionFor("not-a-token")).toBeNull();
    expect(await sessionFor(undefined)).toBeNull();
    const stored = await sql<{ token_hash: string }[]>`select token_hash from session where owner_id = ${ANA}`;
    expect(stored).toHaveLength(1);
    expect(stored[0].token_hash).not.toBe(token);
  });

  test("stops working once it has expired", async () => {
    const token = await startSession(ANA, "ana@example.com");
    expect((await sql`update session set expires_at = now() - interval '1 minute' where owner_id = ${ANA} returning owner_id`).length).toBe(1);
    expect(await sessionFor(token)).toBeNull();
  });
});

describe("someone's own data", () => {
  test("can be taken out whole", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: at }], ANA);
    await saveSkin("arcade", ANA);
    const record = await ownerRecord(ANA);
    expect(record.encounters.map((e) => ({ food: e.food, encounteredAt: e.encounteredAt }))).toEqual([{ food: "carrot", encounteredAt: at }]);
    expect(record.skin).toBe("arcade");
  });

  test("is all removed when they delete their account, and nobody else's is touched", async () => {
    await recordEncounters([{ food: "carrot", encounteredAt: at }], ANA);
    await recordEncounters([{ food: "kale", encounteredAt: at }], BO);
    await saveSkin("arcade", ANA);
    const token = await startSession(ANA, "ana@example.com");
    await eraseOwner(ANA);
    expect(await encounteredFoods(ANA)).toEqual([]);
    expect(await savedSkin(ANA)).toBeNull();
    expect(await sessionFor(token)).toBeNull();
    expect(await encounteredFoods(BO)).toEqual(["kale"]);
  });
});
