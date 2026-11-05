// The skin that follows someone between their devices. Whatever choice is stored is put back after the run.
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { GET, PUT } from "../app/api/preferences/route.ts";
import { sql } from "../lib/db/client.ts";
import { savedSkin, saveSkin } from "../lib/db/preferences.ts";

const TOKEN = "preferences-test-token";
const url = "http://dex.test/api/preferences";
const headers = (token: string | null) => ({ "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) });
const get = (token: string | null = TOKEN) => GET(new Request(url, { headers: headers(token) }));
const put = (body: unknown, token: string | null = TOKEN) => PUT(new Request(url, { method: "PUT", headers: headers(token), body: JSON.stringify(body) }));

let before: { key: string; value: string; updated_at: Date }[];

beforeAll(async () => {
  before = [...(await sql<{ key: string; value: string; updated_at: Date }[]>`select * from preference`)];
  await sql`delete from preference`;
  vi.stubEnv("NUTRIDEX_UPLOAD_TOKEN", TOKEN);
});
afterEach(async () => {
  await sql`delete from preference`;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  for (const row of before) await sql`insert into preference ${sql(row)}`;
  await sql.end();
});

describe("the saved skin", () => {
  test("is nothing until someone chooses, so no device is told to change", async () => {
    expect(await savedSkin()).toBeNull();
    expect(await (await get()).json()).toEqual({ skin: null });
  });

  test("is what was chosen last", async () => {
    await saveSkin("yellow-version");
    await saveSkin("new-age");
    expect(await savedSkin()).toBe("new-age");
  });

  test("reaches another device through the API", async () => {
    expect((await put({ skin: "yellow-version" })).status).toBe(200);
    expect(await (await get()).json()).toEqual({ skin: "yellow-version" });
  });

  test("refuses a skin that does not exist, and keeps what was there", async () => {
    await saveSkin("yellow-version");
    const refused = await put({ skin: "neon" });
    expect(refused.status).toBe(400);
    expect(await savedSkin()).toBe("yellow-version");
  });

  test("needs the upload passcode to read or change", async () => {
    expect((await get("wrong-token")).status).toBe(401);
    expect((await put({ skin: "new-age" }, null)).status).toBe(401);
    expect(await savedSkin()).toBeNull();
  });

  test("is refused altogether when the server has no passcode set", async () => {
    vi.stubEnv("NUTRIDEX_UPLOAD_TOKEN", "");
    expect((await get()).status).toBe(503);
    vi.stubEnv("NUTRIDEX_UPLOAD_TOKEN", TOKEN);
  });
});
