// The cookies that hold the web game's state on this device.
export const PENDING_COOKIE = "nutridex-pending";
export const UNLOCKING_COOKIE = "nutridex-unlocking";
export const SESSION_COOKIE = "nutridex-session";
export const SKIN_COOKIE = "nutridex-skin";

export type PendingEncounter = { food: string; encounteredAt: string };

// RFC 6265 section 6.1 asks a browser to keep at least 4,096 bytes per cookie, counting its name, value and
// attributes, and these attributes take under 100. A bigger cookie is dropped without a word. Next encodes
// the value with encodeURIComponent, so that is the size that counts.
const PENDING_LIMIT_BYTES = 4_000;

// A slug holds only these characters, which leaves "~" and "." free to join entries without escaping.
const SLUG = /^[a-z0-9-]+$/;

/**
 * @param pending [PendingEncounter[]] what this device has not uploaded
 * @param food [string] the food to add
 * @param encounteredAt [string] when it was had
 * @return [string | null] the cookie's new value, or null when the list would no longer fit in a cookie
 * @throws when `food` could not be a food's slug
 */
export function withPending(pending: PendingEncounter[], food: string, encounteredAt: string): string | null {
  if (!SLUG.test(food)) throw new Error(`"${food}" could not be a food's slug`);
  // Each entry is `slug~time`, the time in base 36: about half the size of JSON once the cookie is encoded.
  const value = [...pending, { food, encounteredAt }].map((p) => `${p.food}~${Date.parse(p.encounteredAt).toString(36)}`).join(".");
  return `${PENDING_COOKIE}=${encodeURIComponent(value)}`.length <= PENDING_LIMIT_BYTES ? value : null;
}

/** @return [PendingEncounter[]] what this device has not uploaded; a cookie that will not parse counts as nothing, since a browser can hold anything */
export function parsePending(value: string | undefined): PendingEncounter[] {
  if (value === undefined || value === "") return [];
  // A browser that saved its list as JSON still holds it that way until it marks another food.
  if (value.startsWith("[") || value.startsWith("{")) return parsePendingJson(value);
  return value.split(".").flatMap((entry) => {
    const [food, time, ...rest] = entry.split("~");
    const at = parseInt(time ?? "", 36);
    return rest.length === 0 && SLUG.test(food) && /^[a-z0-9]+$/.test(time ?? "") && Number.isFinite(new Date(at).getTime()) ? [{ food, encounteredAt: new Date(at).toISOString() }] : [];
  });
}

function parsePendingJson(value: string): PendingEncounter[] {
  try {
    const parsed: unknown = JSON.parse(value);
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
