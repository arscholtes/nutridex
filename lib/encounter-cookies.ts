// The cookies that hold the web game's state on this device.
import { timingSafeEqual } from "node:crypto";

export const PENDING_COOKIE = "nutridex-pending";
export const UNLOCKING_COOKIE = "nutridex-unlocking";
export const UPLOAD_COOKIE = "nutridex-upload";
export const SKIN_COOKIE = "nutridex-skin";

export type PendingEncounter = { food: string; encounteredAt: string };

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
