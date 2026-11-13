// The sign-in service is asked to email a code and check one, and to vouch for someone who came through Google or Apple.
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { exchangeCode, providerProblem, providerStart, requestCode, signInConfigured, signInProviders, verifyCode } from "../lib/auth/sign-in.ts";

const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
const answerWith = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string>; body?: string }) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body ?? "{}") });
    return Response.json(body, { status });
  });

beforeEach(() => {
  calls.length = 0;
  vi.stubEnv("SUPABASE_URL", "https://auth.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("asking for a code", () => {
  test("sends the address, tidied, and lets a new person in", async () => {
    answerWith(200, {});
    expect(await requestCode("  Ana@Example.com ")).toBeNull();
    expect(calls).toEqual([{ url: "https://auth.test/auth/v1/otp", headers: { apikey: "public-key", "content-type": "application/json" }, body: { email: "ana@example.com", create_user: true } }]);
  });

  test("says to wait when codes are being sent too fast", async () => {
    answerWith(429, { error_code: "over_email_send_rate_limit" });
    expect(await requestCode("ana@example.com")).toMatch(/wait/i);
  });

  test("refuses something that is not an email address without asking the service", async () => {
    answerWith(200, {});
    expect(await requestCode("not an address")).toMatch(/email/i);
    expect(calls).toEqual([]);
  });
});

describe("checking a code", () => {
  test("names the person when the code is right", async () => {
    answerWith(200, { access_token: "t", user: { id: "11111111-1111-4111-8111-111111111111", email: "ana@example.com" } });
    expect(await verifyCode("Ana@example.com", " 123456 ")).toEqual({ id: "11111111-1111-4111-8111-111111111111", email: "ana@example.com" });
    expect(calls[0].url).toBe("https://auth.test/auth/v1/verify");
    expect(calls[0].body).toEqual({ type: "email", email: "ana@example.com", token: "123456" });
  });

  test("says so when the code is wrong or too old", async () => {
    answerWith(403, { error_code: "otp_expired" });
    expect(await verifyCode("ana@example.com", "000000")).toEqual({ error: expect.stringMatching(/code/i) });
  });
});

test("a server with no sign-in service says so, and throws if asked anyway", async () => {
  vi.stubEnv("SUPABASE_URL", "");
  expect(signInConfigured()).toBe(false);
  await expect(requestCode("ana@example.com")).rejects.toThrow(/SUPABASE_URL/);
});

describe("signing in through Google or Apple", () => {
  test("offers only the ways the service has switched on", async () => {
    vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, headers: init.headers, body: {} });
      return Response.json({ external: { apple: false, google: true, email: true, github: true } });
    });
    expect(await signInProviders()).toEqual(["google"]);
    expect(calls).toEqual([{ url: "https://auth.test/auth/v1/settings", headers: { apikey: "public-key" }, body: {} }]);
  });

  test("offers none when the service cannot say, and none on a server with no service", async () => {
    answerWith(500, {});
    expect(await signInProviders()).toEqual([]);
    vi.stubEnv("SUPABASE_URL", "");
    expect(await signInProviders()).toEqual([]);
  });

  test("starts at the service with a proof only this browser can finish, and comes back to our callback", async () => {
    const { url, verifier } = await providerStart("google", "https://nutridex.test");
    const at = new URL(url);
    expect(at.origin + at.pathname).toBe("https://auth.test/auth/v1/authorize");
    expect(at.searchParams.get("provider")).toBe("google");
    expect(at.searchParams.get("redirect_to")).toBe("https://nutridex.test/auth/callback");
    expect(at.searchParams.get("code_challenge_method")).toBe("s256");
    expect(at.searchParams.get("code_challenge")).toBe(createHash("sha256").update(verifier).digest("base64url"));
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,}$/);
    expect((await providerStart("google", "https://nutridex.test")).verifier).not.toBe(verifier);
  });

  test("trades the code that came back, with the proof, for who the person is", async () => {
    answerWith(200, { access_token: "t", user: { id: "11111111-1111-4111-8111-111111111111", email: "ana@example.com" } });
    expect(await exchangeCode("the-code", "the-verifier")).toEqual({ id: "11111111-1111-4111-8111-111111111111", email: "ana@example.com" });
    expect(calls[0].url).toBe("https://auth.test/auth/v1/token?grant_type=pkce");
    expect(calls[0].body).toEqual({ auth_code: "the-code", code_verifier: "the-verifier" });
  });

  test("says so when the code is refused, and when the provider gave no email address", async () => {
    answerWith(400, { error_code: "flow_state_not_found" });
    expect(await exchangeCode("old", "v")).toEqual({ problem: "unfinished" });
    answerWith(200, { user: { id: "11111111-1111-4111-8111-111111111111" } });
    expect(await exchangeCode("c", "v")).toEqual({ problem: "no-email" });
  });

  test("only its own named problems become a sentence on the page", () => {
    expect(providerProblem("unfinished")).toMatch(/again/i);
    expect(providerProblem("no-email")).toMatch(/email/i);
    expect(providerProblem("constructor")).toBeNull();
    expect(providerProblem("<b>pay me</b>")).toBeNull();
    expect(providerProblem(undefined)).toBeNull();
  });
});
