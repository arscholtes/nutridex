// Once someone is proven, by code or through Google or Apple, this browser's game becomes their account's.
import { afterAll, afterEach, expect, test } from "vitest";
import type { cookies } from "next/headers";
import { beginSession } from "../lib/auth/begin-session.ts";
import { sql } from "../lib/db/client.ts";
import { encounteredFoods } from "../lib/db/encounters.ts";
import { savedSkin, saveSkin } from "../lib/db/preferences.ts";
import { sessionFor } from "../lib/db/sessions.ts";
import { PENDING_COOKIE, SESSION_COOKIE, SKIN_COOKIE, UNLOCKING_COOKIE } from "../lib/encounter-cookies.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the session test writes to the database");

const CAL = "33333333-3333-4333-8333-333333333333";
const at = "2026-11-13T12:00:00.000Z";

/** A browser's cookies, as far as beginSession uses them. */
const jarHolding = (held: Record<string, string>) => {
  const store = new Map(Object.entries(held));
  const jar = {
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    set: (name: string, value: string) => void store.set(name, value),
    delete: (name: string) => void store.delete(name),
  };
  return { store, jar: jar as unknown as Awaited<ReturnType<typeof cookies>> };
};

afterEach(async () => {
  await sql`delete from encounter where owner_id = ${CAL}`;
  await sql`delete from preference where owner_id = ${CAL}`;
  await sql`delete from session where owner_id = ${CAL}`;
});
afterAll(() => sql.end());

test("signs the browser in and moves its foods and its skin onto the account", async () => {
  const { store, jar } = jarHolding({
    [PENDING_COOKIE]: JSON.stringify([{ food: "carrot", encounteredAt: at }, { food: "kale", encounteredAt: at }]),
    [SKIN_COOKIE]: "arcade",
  });
  await beginSession(jar, { id: CAL, email: "cal@example.com" });
  expect(await sessionFor(store.get(SESSION_COOKIE))).toEqual({ owner: CAL, email: "cal@example.com" });
  expect(await encounteredFoods(CAL)).toEqual(["carrot", "kale"]);
  expect(store.has(PENDING_COOKIE)).toBe(false);
  expect(JSON.parse(store.get(UNLOCKING_COOKIE)!)).toEqual(["carrot", "kale"]);
  expect(await savedSkin(CAL)).toBe("arcade");
});

test("leaves the account's own skin alone, and plays no unlock for foods it already had", async () => {
  await saveSkin("receipt", CAL);
  await beginSession(jarHolding({ [PENDING_COOKIE]: JSON.stringify([{ food: "carrot", encounteredAt: at }]) }).jar, { id: CAL, email: "cal@example.com" });
  const { store, jar } = jarHolding({ [PENDING_COOKIE]: JSON.stringify([{ food: "carrot", encounteredAt: at }]), [SKIN_COOKIE]: "arcade" });
  await beginSession(jar, { id: CAL, email: "cal@example.com" });
  expect(await savedSkin(CAL)).toBe("receipt");
  expect(store.has(UNLOCKING_COOKIE)).toBe(false);
  expect(await encounteredFoods(CAL)).toEqual(["carrot"]);
});
