"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { recordEncounters } from "../lib/db/encounters.ts";
import { saveSkin } from "../lib/db/preferences.ts";
import { ACCEPTANCE_COOKIE, appVersion } from "../lib/disclaimer/gate.ts";
import { parsePending, PENDING_COOKIE, SKIN_COOKIE, tokenMatches, UNLOCKING_COOKIE, UPLOAD_COOKIE } from "../lib/encounter-cookies.ts";
import { parseSkin } from "../lib/skins.ts";

// Browsers cap a cookie's lifetime at 400 days; after that the notice appears once more.
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Records on this device that the running version's disclaimer was accepted. */
export async function acceptDisclaimer() {
  (await cookies()).set(ACCEPTANCE_COOKIE, appVersion(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

const YEAR_SECONDS = 365 * 24 * 60 * 60;
const privateCookie = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR_SECONDS } as const;

/** Marks a food as had on this device, which unlocks it here until it is uploaded. */
export async function markEncountered(food: string) {
  const jar = await cookies();
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  if (pending.some((p) => p.food === food)) return;
  jar.set(PENDING_COOKIE, JSON.stringify([...pending, { food, encounteredAt: new Date().toISOString() }]), privateCookie);
}

export type UploadState = { error: string | null };

/** Uploads everything new on this device to the home database, then queues the unlock animation. */
export async function uploadEncounters(_previous: UploadState, form: FormData): Promise<UploadState> {
  const jar = await cookies();
  const passcode = (form.get("passcode") as string | null) || jar.get(UPLOAD_COOKIE)?.value || "";
  const configured = process.env.NUTRIDEX_UPLOAD_TOKEN;
  if (!configured) return { error: "This server has no upload passcode set, so it cannot take uploads." };
  if (!tokenMatches(passcode, configured)) return { error: "That passcode is not right." };
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  const { added, unknown } = await recordEncounters(pending);
  if (unknown.length > 0) return { error: `These are not foods in the Dex: ${unknown.join(", ")}.` };
  jar.set(UPLOAD_COOKIE, passcode, privateCookie);
  jar.delete(PENDING_COOKIE);
  jar.set(UNLOCKING_COOKIE, JSON.stringify(added), privateCookie);
  return { error: null };
}

/** Ends the unlock animation, leaving you on the screen you were on. */
export async function finishUnlock() {
  (await cookies()).delete(UNLOCKING_COOKIE);
}

/** Changes the look on this device, and on every device sharing its passcode. */
export async function chooseSkin(id: string) {
  const skin = parseSkin(id);
  if (!skin) throw new Error(`NutriDex has no skin called ${id}`);
  const jar = await cookies();
  jar.set(SKIN_COOKIE, skin, privateCookie);
  const configured = process.env.NUTRIDEX_UPLOAD_TOKEN;
  if (configured && tokenMatches(jar.get(UPLOAD_COOKIE)?.value ?? "", configured)) await saveSkin(skin);
  revalidatePath("/", "layout");
}
