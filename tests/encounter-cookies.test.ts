// The web game's device state, which a browser can hold in any shape.
import { describe, expect, test } from "vitest";
import { parsePending, parseUnlocking, PENDING_COOKIE, withPending, type PendingEncounter } from "../lib/encounter-cookies.ts";

const AT = "2026-11-06T12:00:00.000Z";

describe("what a cookie holds", () => {
  test("pending encounters read back", () => {
    const pending = [{ food: "carrot", encounteredAt: "2026-11-02T12:00:00.000Z" }];
    expect(parsePending(JSON.stringify(pending))).toEqual(pending);
  });

  test.each([["nothing", undefined], ["not JSON", "{oops"], ["not a list", '{"food":"carrot"}']])("%s counts as none", (_what, value) => {
    expect(parsePending(value)).toEqual([]);
    expect(parseUnlocking(value)).toEqual([]);
  });

  test("a food waiting to upload is added to the list", () => {
    expect(parsePending(withPending([], "carrot", AT)!)).toEqual([{ food: "carrot", encounteredAt: AT }]);
  });

  test("a food that would make the cookie too big for a browser to keep is refused, not dropped in silence", () => {
    // Slugs average 50 characters across the 7,793 foods.
    const slug = (n: number) => `${"food-of-average-length-".repeat(2)}${String(n).padStart(4, "0")}`;
    expect(slug(1)).toHaveLength(50);
    const size = (pending: PendingEncounter[]) => `${PENDING_COOKIE}=${encodeURIComponent(JSON.stringify(pending))}`.length;
    let pending: PendingEncounter[] = [];
    for (let n = 0; ; n++) {
      const value = withPending(pending, slug(n), AT);
      if (value === null) {
        expect(size([...pending, { food: slug(n), encounteredAt: AT }])).toBeGreaterThan(4_000);
        break;
      }
      pending = parsePending(value);
      expect(size(pending)).toBeLessThanOrEqual(4_000);
    }
    expect(pending.length).toBeGreaterThan(20);
  });

  test("an entry of the wrong shape is dropped and the rest kept", () => {
    expect(parsePending(JSON.stringify([{ food: 3 }, { food: "egg", encounteredAt: "2026-11-02T12:00:00.000Z" }])).map((p) => p.food)).toEqual(["egg"]);
    expect(parseUnlocking(JSON.stringify(["carrot", 4]))).toEqual(["carrot"]);
  });
});
