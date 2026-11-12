// The sign-in service is asked for two things only: email a code, and check one.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { requestCode, signInConfigured, verifyCode } from "../lib/auth/sign-in.ts";

const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
const answerWith = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
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
