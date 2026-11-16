// Marking a food as had from a browser with no account: only a food the Dex has is kept.
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import { sql } from "../lib/db/client.ts";
import { parsePending, PENDING_COOKIE } from "../lib/encounter-cookies.ts";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { markEncountered } = await import("../app/actions.ts");

beforeEach(() => jar.clear());
afterAll(() => sql.end());

describe("marking a food with no account", () => {
  test("a food the Dex has is kept in this browser", async () => {
    expect(await sql`select 1 from ingredient where slug = 'carrot'`).toHaveLength(1);
    expect(await markEncountered("carrot")).toEqual({ error: null });
    expect(parsePending(jar.get(PENDING_COOKIE)).map((p) => p.food)).toEqual(["carrot"]);
  });

  test("a food the Dex does not have is refused, and this browser keeps nothing", async () => {
    expect(await sql`select 1 from ingredient where slug = 'no-such-food'`).toHaveLength(0);
    expect(await markEncountered("no-such-food")).toEqual({ error: "That is not a food in the Dex." });
    expect(jar.has(PENDING_COOKIE)).toBe(false);
  });
});
