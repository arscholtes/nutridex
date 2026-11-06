// The cookies that hold the web game's state on this device.
import { timingSafeEqual } from "node:crypto";

export const PENDING_COOKIE = "nutridex-pending";
export const UNLOCKING_COOKIE = "nutridex-unlocking";
export const UPLOAD_COOKIE = "nutridex-upload";
export const SKIN_COOKIE = "nutridex-skin";

export type PendingEncounter = { food: string; encounteredAt: string };

// RFC 6265 section 6.1 asks a browser to keep at least 4,096 bytes per cookie, counting its name, value and
// attributes, and these attributes take under 100. A bigger cookie is dropped without a word. Next encodes
// the value with encodeURIComponent, so that is the size that counts.
const PENDING_LIMIT_BYTES = 4_000;

/**
 * @param pending [PendingEncounter[]] what this device has not uploaded
 * @param food [string] the food to add
 * @param encounteredAt [string] when it was had
 * @return [string | null] the cookie's new value, or null when the list would no longer fit in a cookie
 */
export function withPending(pending: PendingEncounter[], food: string, encounteredAt: string): string | null {
  const value = JSON.stringify([...pending, { food, encounteredAt }]);
  return `${PENDING_COOKIE}=${encodeURIComponent(value)}`.length <= PENDING_LIMIT_BYTES ? value : null;
}

/** @return [PendingEncounter[]] what this device has not uploaded; a cookie that will not parse counts as nothing, since a browser can hold anything */
export function parsePending(value: string | undefined): PendingEncounter[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((p): p is PendingEncounter => typeof p?.food === "string" && typeof p?.encounteredAt === "string") : [];
  } catch {
    return [];
  }
}

/** @return [string[]] the foods queued for the unlock animation */
export function parseUnlocking(value: string | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

/** @return [boolean] whether a passcode is the configured upload token */
export function tokenMatches(given: string, configured: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}
