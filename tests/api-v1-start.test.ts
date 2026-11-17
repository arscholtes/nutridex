// An app's Google sign-in starts here: the server knows where the sign-in service is, the app keeps the secret.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET as start } from "../app/api/v1/session/start/route.ts";

const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const open = (query: string) => start(new Request(`http://dex.test/api/v1/session/start?${query}`));

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://auth.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("starting an app's sign-in through the system sheet", () => {
  test("sends the sheet to the sign-in service with the app's challenge, to come back to the app", async () => {
    const res = await open(`provider=google&challenge=${CHALLENGE}`);
    expect(res.status).toBe(302);
    const to = new URL(res.headers.get("location")!);
    expect(`${to.origin}${to.pathname}`).toBe("https://auth.test/auth/v1/authorize");
    expect(Object.fromEntries(to.searchParams)).toEqual({
      provider: "google",
      redirect_to: "nutridex://auth/callback",
      code_challenge: CHALLENGE,
      code_challenge_method: "s256",
    });
  });

  test("only ever comes back to the app, whatever else the address asks for", async () => {
    const res = await open(`provider=google&challenge=${CHALLENGE}&redirect_to=https://elsewhere.test`);
    expect(new URL(res.headers.get("location")!).searchParams.get("redirect_to")).toBe("nutridex://auth/callback");
  });

  test("refuses an unknown provider or a challenge that is not one", async () => {
    expect((await open(`provider=facebook&challenge=${CHALLENGE}`)).status).toBe(400);
    expect((await open("provider=google")).status).toBe(400);
    expect((await open("provider=google&challenge=too-short")).status).toBe(400);
  });
});
