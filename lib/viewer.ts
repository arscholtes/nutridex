// What this visitor may see: what this browser has marked, and their own record once they are signed in.
import { cache } from "react";
import { cookies } from "next/headers";
import { encounteredFoods, revealedEntries, type Revealed } from "./db/encounters.ts";
import { savedSkin } from "./db/preferences.ts";
import { sessionFor, type Session } from "./db/sessions.ts";
import { DEFAULT_SKIN, parseSkin, type Skin } from "./skins.ts";
import { parsePending, parseUnlocking, PENDING_COOKIE, SESSION_COOKIE, SKIN_COOKIE, UNLOCKING_COOKIE, type PendingEncounter } from "./encounter-cookies.ts";

export type Viewer = { revealed: Revealed; pending: PendingEncounter[]; account: Session | null; unlocking: string[] };

/** @return [Promise<Session | null>] who is signed in on this browser, asked once per request */
export const signedIn = cache(async (): Promise<Session | null> => sessionFor((await cookies()).get(SESSION_COOKIE)?.value));

/** @return [Promise<{ skin: Skin; syncs: boolean }>] the look to show, and whether it follows this visitor to their other devices */
export async function currentSkin(): Promise<{ skin: Skin; syncs: boolean }> {
  const here = parseSkin((await cookies()).get(SKIN_COOKIE)?.value);
  const account = await signedIn();
  return { skin: (account ? await savedSkin(account.owner) : null) ?? here ?? DEFAULT_SKIN, syncs: account !== null };
}

/** @return [Promise<Viewer>] this visitor's game; a saved record is a personal fact, so only its owner's session reads it */
export async function viewer(): Promise<Viewer> {
  const jar = await cookies();
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  const account = await signedIn();
  const saved = account ? await encounteredFoods(account.owner) : [];
  return {
    revealed: await revealedEntries([...new Set([...saved, ...pending.map((p) => p.food)])]),
    pending,
    account,
    unlocking: parseUnlocking(jar.get(UNLOCKING_COOKIE)?.value),
  };
}
