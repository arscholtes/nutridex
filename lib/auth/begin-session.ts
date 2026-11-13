// What happens once someone has proven who they are, by code or through Google or Apple.
import type { cookies } from "next/headers";
import { recordEncounters } from "../db/encounters.ts";
import { savedSkin, saveSkin } from "../db/preferences.ts";
import { SESSION_DAYS, startSession } from "../db/sessions.ts";
import { parsePending, PENDING_COOKIE, privateCookie, SESSION_COOKIE, SKIN_COOKIE, UNLOCKING_COOKIE } from "../encounter-cookies.ts";
import { parseSkin } from "../skins.ts";
import type { Proven } from "./sign-in.ts";

/** How long a browser may take at Google or Apple before the sign-in it started is forgotten. */
export const PROOF_MINUTES = 10;

/**
 * Starts this browser's session and moves what it was holding onto the account.
 * @param jar [Awaited<ReturnType<typeof cookies>>] this request's cookies
 * @param proven [Proven] who the sign-in service says this is
 */
export async function beginSession(jar: Awaited<ReturnType<typeof cookies>>, proven: Proven): Promise<void> {
  jar.set(SESSION_COOKIE, await startSession(proven.id, proven.email), { ...privateCookie, maxAge: SESSION_DAYS * 24 * 60 * 60 });
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  const { added, unknown } = await recordEncounters(pending, proven.id);
  if (unknown.length > 0) console.error(`sign-in: this browser held foods the Dex does not have, so none were saved: ${unknown.join(", ")}`);
  jar.delete(PENDING_COOKIE);
  if (added.length > 0) jar.set(UNLOCKING_COOKIE, JSON.stringify(added), privateCookie);
  const here = parseSkin(jar.get(SKIN_COOKIE)?.value);
  if (here && (await savedSkin(proven.id)) === null) await saveSkin(here, proven.id);
}
