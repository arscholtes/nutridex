// The web game's device state, which a browser can hold in any shape.
import { describe, expect, test } from "vitest";
import { parsePending, parseUnlocking, tokenMatches } from "../lib/encounter-cookies.ts";

describe("the upload passcode", () => {
  test("the right one matches", () => {
    expect(tokenMatches("secret-value", "secret-value")).toBe(true);
  });

  test.each([["wrong, same length", "secret-valuX"], ["wrong, shorter", "secret"], ["empty", ""]])("%s does not", (_what, given) => {
    expect(tokenMatches(given, "secret-value")).toBe(false);
  });
});

describe("what a cookie holds", () => {
  test("pending encounters read back", () => {
    const pending = [{ food: "carrot", encounteredAt: "2026-11-02T12:00:00.000Z" }];
    expect(parsePending(JSON.stringify(pending))).toEqual(pending);
  });

  test.each([["nothing", undefined], ["not JSON", "{oops"], ["not a list", '{"food":"carrot"}']])("%s counts as none", (_what, value) => {
    expect(parsePending(value)).toEqual([]);
    expect(parseUnlocking(value)).toEqual([]);
  });

  test("an entry of the wrong shape is dropped and the rest kept", () => {
    expect(parsePending(JSON.stringify([{ food: 3 }, { food: "egg", encounteredAt: "2026-11-02T12:00:00.000Z" }])).map((p) => p.food)).toEqual(["egg"]);
    expect(parseUnlocking(JSON.stringify(["carrot", 4]))).toEqual(["carrot"]);
  });
});
