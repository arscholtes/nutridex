// The API every app shares: sign in, then read and change your own record with the session as a bearer token.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { POST as requestCodeRoute } from "../app/api/v1/session/code/route.ts";
import { DELETE as signOut, POST as signIn } from "../app/api/v1/session/route.ts";
import { DELETE as deleteMe, GET as me } from "../app/api/v1/me/route.ts";
import { POST as upload } from "../app/api/v1/me/encounters/route.ts";
import { PUT as putSkin } from "../app/api/v1/me/skin/route.ts";
import { GET as myRecipes, POST as saveRecipeRoute } from "../app/api/v1/me/recipes/route.ts";
import { GET as exportMe } from "../app/api/v1/me/export/route.ts";
import { POST as preview } from "../app/api/v1/recipes/preview/route.ts";
import { sql } from "../lib/db/client.ts";
import { sessionFor, startSession } from "../lib/db/sessions.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the API test writes to the database");

const FAY = "77777777-7777-4777-8777-777777777777";
const GUS = "88888888-8888-4888-8888-888888888888";
const day = (n: number) => `2026-11-${String(n).padStart(2, "0")}T12:00:00.000Z`;

const call = (method: string, token: string | null, body?: unknown) =>
  new Request("http://dex.test/api/v1", {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** What the sign-in service will answer, in order. */
const serviceAnswers = (...answers: { status: number; body: unknown }[]) => {
  const asked: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: { body?: string }) => {
    asked.push({ url, body: JSON.parse(init.body ?? "{}") });
    const next = answers.shift();
    if (!next) throw new Error(`the test did not expect a call to ${url}`);
    return Response.json(next.body, { status: next.status });
  });
  return asked;
};

const clear = async () => {
  await sql`delete from encounter where owner_id in (${FAY}, ${GUS})`;
  await sql`delete from preference where owner_id in (${FAY}, ${GUS})`;
  await sql`delete from recipe where owner_id in (${FAY}, ${GUS})`;
  await sql`delete from session where owner_id in (${FAY}, ${GUS})`;
  await sql`delete from auth.users where id in (${FAY}, ${GUS})`;
};

// The sign-in service's users live in the hosted database's auth schema. The test database has no such service,
// so it gets the one table account deletion touches.
beforeAll(async () => {
  await sql`create schema if not exists auth`;
  await sql`create table if not exists auth.users (id uuid primary key)`;
});
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://auth.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-key");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await clear();
});
afterAll(() => sql.end());

describe("signing in", () => {
  test("with an emailed code: ask for it, then trade it for a session", async () => {
    const asked = serviceAnswers({ status: 200, body: {} }, { status: 200, body: { user: { id: FAY, email: "fay@example.com" } } });
    expect((await requestCodeRoute(call("POST", null, { email: "fay@example.com" }))).status).toBe(204);
    const res = await signIn(call("POST", null, { email: "fay@example.com", code: "123456" }));
    expect(res.status).toBe(200);
    const { token, email, expiresAt } = await res.json();
    expect(email).toBe("fay@example.com");
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now() + 89 * 24 * 60 * 60 * 1000);
    expect(await sessionFor(token)).toEqual({ owner: FAY, email: "fay@example.com" });
    expect(asked.map((a) => a.url)).toEqual(["https://auth.test/auth/v1/otp", "https://auth.test/auth/v1/verify"]);
  });

  test("with the identity token Apple or Google gave the app", async () => {
    const asked = serviceAnswers({ status: 200, body: { user: { id: FAY, email: "fay@example.com" } } });
    const res = await signIn(call("POST", null, { provider: "apple", idToken: "signed.by.apple", nonce: "n-1" }));
    expect(res.status).toBe(200);
    expect(await sessionFor((await res.json()).token)).toEqual({ owner: FAY, email: "fay@example.com" });
    expect(asked).toEqual([{ url: "https://auth.test/auth/v1/token?grant_type=id_token", body: { provider: "apple", id_token: "signed.by.apple", nonce: "n-1" } }]);
  });

  test("is refused with the reason when the code or the token is not accepted", async () => {
    serviceAnswers({ status: 403, body: { error_code: "otp_expired" } }, { status: 400, body: { error_code: "bad_jwt" } });
    const wrongCode = await signIn(call("POST", null, { email: "fay@example.com", code: "000000" }));
    expect(wrongCode.status).toBe(401);
    expect((await wrongCode.json()).error).toMatch(/code/i);
    expect((await signIn(call("POST", null, { provider: "google", idToken: "forged" }))).status).toBe(401);
  });

  test("says what to send when the body is neither", async () => {
    serviceAnswers();
    expect((await signIn(call("POST", null, { provider: "facebook", idToken: "x" }))).status).toBe(400);
    expect((await signIn(call("POST", null, {}))).status).toBe(400);
    expect((await requestCodeRoute(call("POST", null, {}))).status).toBe(400);
  });

  test("signing out ends that session and no other", async () => {
    const [here, there] = [await startSession(FAY, "fay@example.com"), await startSession(FAY, "fay@example.com")];
    expect((await signOut(call("DELETE", here))).status).toBe(204);
    expect(await sessionFor(here)).toBeNull();
    expect(await sessionFor(there)).not.toBeNull();
  });
});

describe("without a session", () => {
  test("every call about a person is refused", async () => {
    for (const refused of [
      await me(call("GET", null)),
      await me(call("GET", "not-a-token")),
      await deleteMe(call("DELETE", null)),
      await upload(call("POST", null, { encounters: [] })),
      await putSkin(call("PUT", null, { skin: "arcade" })),
      await myRecipes(call("GET", null)),
      await saveRecipeRoute(call("POST", null, {})),
      await exportMe(call("GET", null)),
      await preview(call("POST", null, {})),
      await signOut(call("DELETE", null)),
    ]) {
      expect(refused.status).toBe(401);
    }
  });
});

describe("your record", () => {
  test("uploads catches, and reads back each food with how often you had it and its tier", async () => {
    const token = await startSession(FAY, "fay@example.com");
    const res = await upload(
      call("POST", token, {
        encounters: [
          { food: "carrot", encounteredAt: day(1), form: "raw" },
          { food: "carrot", encounteredAt: day(2), form: "juiced" },
          { food: "carrot", encounteredAt: day(3) },
          { food: "kale", encounteredAt: day(3) },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const uploaded = await res.json();
    expect(uploaded.new).toEqual(["carrot", "kale"]);
    const mine = await (await me(call("GET", token))).json();
    expect(mine).toEqual({
      email: "fay@example.com",
      skin: null,
      rank: "Kitchen hand",
      foods: [
        { food: "carrot", firstHadAt: day(1), catches: 3, forms: 2, tier: 2 },
        { food: "kale", firstHadAt: day(3), catches: 1, forms: 0, tier: 1 },
      ],
    });
    expect(uploaded.foods).toEqual(mine.foods);
  });

  test("is your own: someone else's token reads theirs", async () => {
    const [fay, gus] = [await startSession(FAY, "fay@example.com"), await startSession(GUS, "gus@example.com")];
    await upload(call("POST", fay, { encounters: [{ food: "carrot", encounteredAt: day(1) }] }));
    expect((await (await me(call("GET", gus))).json()).foods).toEqual([]);
  });

  test("refuses an unknown food or form and stores nothing", async () => {
    const token = await startSession(FAY, "fay@example.com");
    expect((await upload(call("POST", token, { encounters: [{ food: "carrot", encounteredAt: day(1) }, { food: "moon-rock", encounteredAt: day(1) }] }))).status).toBe(422);
    expect((await upload(call("POST", token, { encounters: [{ food: "carrot", encounteredAt: day(1), form: "fried" }] }))).status).toBe(400);
    expect((await (await me(call("GET", token))).json()).foods).toEqual([]);
  });

  test("keeps your skin", async () => {
    const token = await startSession(FAY, "fay@example.com");
    expect((await putSkin(call("PUT", token, { skin: "arcade" }))).status).toBe(200);
    expect((await putSkin(call("PUT", token, { skin: "plaid" }))).status).toBe(400);
    expect((await (await me(call("GET", token))).json()).skin).toBe("arcade");
  });
});

const DRAFT = {
  name: "Carrot and kale",
  servings: 2,
  ingredients: [{ food: "carrot", grams: 122, prepMethod: "raw" }, { food: "kale", grams: 42, prepMethod: "raw" }],
  steps: [{ title: "Chop", prepMethod: null, uses: [0, 1] }],
};

describe("your recipes", () => {
  test("preview one from foods you own, save it, and list it", async () => {
    const token = await startSession(FAY, "fay@example.com");
    await upload(call("POST", token, { encounters: [{ food: "carrot", encounteredAt: day(1) }, { food: "kale", encounteredAt: day(1) }] }));
    const previewed = await preview(call("POST", token, { recipe: DRAFT }));
    expect(previewed.status).toBe(200);
    expect((await previewed.json()).name).toBe("Carrot and kale");
    const saved = await saveRecipeRoute(call("POST", token, { recipe: DRAFT }));
    expect(saved.status).toBe(201);
    const { slug } = await saved.json();
    expect((await (await myRecipes(call("GET", token))).json()).recipes).toEqual([{ slug, ...DRAFT }]);
  });

  test("a recipe using a food you have not caught is refused with every reason, and one that is not a recipe says so", async () => {
    const token = await startSession(FAY, "fay@example.com");
    await upload(call("POST", token, { encounters: [{ food: "carrot", encounteredAt: day(1) }] }));
    const refused = await saveRecipeRoute(call("POST", token, { recipe: DRAFT }));
    expect(refused.status).toBe(422);
    expect((await refused.json()).problems.length).toBeGreaterThan(0);
    expect((await preview(call("POST", token, { recipe: DRAFT }))).status).toBe(422);
    expect((await saveRecipeRoute(call("POST", token, { recipe: { name: 3 } }))).status).toBe(400);
  });
});

describe("taking your data out, and deleting it", () => {
  test("the export holds everything, and deleting removes it and the sign-in", async () => {
    const token = await startSession(FAY, "fay@example.com");
    await upload(call("POST", token, { encounters: [{ food: "carrot", encounteredAt: day(1), form: "raw" }] }));
    await putSkin(call("PUT", token, { skin: "arcade" }));
    const exported = await (await exportMe(call("GET", token))).json();
    expect(exported.email).toBe("fay@example.com");
    expect(exported.catches).toEqual([{ food: "carrot", caughtAt: day(1), form: "raw", recipe: null }]);
    expect(exported.skin).toBe("arcade");

    await sql`insert into auth.users (id) values (${FAY})`;
    expect((await deleteMe(call("DELETE", token))).status).toBe(204);
    expect((await sql`select count(*)::int as n from auth.users where id = ${FAY}`)[0].n).toBe(0);
    expect(await sessionFor(token)).toBeNull();
    expect((await sql`select count(*)::int as n from encounter where owner_id = ${FAY}`)[0].n).toBe(0);
  });
});
