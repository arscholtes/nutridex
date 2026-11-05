// What this visitor may see: what this device has marked, and what it has uploaded if it holds the passcode.
import { cookies } from "next/headers";
import { encounteredFoods, revealedEntries, type Revealed } from "./db/encounters.ts";
import { savedSkin } from "./db/preferences.ts";
import { DEFAULT_SKIN, parseSkin, type Skin } from "./skins.ts";
import { parsePending, parseUnlocking, PENDING_COOKIE, SKIN_COOKIE, tokenMatches, UNLOCKING_COOKIE, UPLOAD_COOKIE, type PendingEncounter } from "./encounter-cookies.ts";

export type Viewer = { revealed: Revealed; pending: PendingEncounter[]; canUpload: boolean; unlocking: string[] };

/** @return [boolean] whether this browser holds the passcode that links someone's devices */
async function holdsPasscode(): Promise<boolean> {
  const configured = process.env.NUTRIDEX_UPLOAD_TOKEN;
  return Boolean(configured) && tokenMatches((await cookies()).get(UPLOAD_COOKIE)?.value ?? "", configured!);
}

/** @return [Promise<{ skin: Skin; syncs: boolean }>] the look to show, and whether it follows this visitor to their other devices */
export async function currentSkin(): Promise<{ skin: Skin; syncs: boolean }> {
  const here = parseSkin((await cookies()).get(SKIN_COOKIE)?.value);
  const syncs = await holdsPasscode();
  return { skin: (syncs ? await savedSkin() : null) ?? here ?? DEFAULT_SKIN, syncs };
}

/** @return [Promise<Viewer>] this visitor's game; the uploaded record is a personal fact, so only the passcode reads it */
export async function viewer(): Promise<Viewer> {
  const jar = await cookies();
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  const canUpload = await holdsPasscode();
  const uploaded = canUpload ? await encounteredFoods() : [];
  return {
    revealed: await revealedEntries([...new Set([...uploaded, ...pending.map((p) => p.food)])]),
    pending,
    canUpload,
    unlocking: parseUnlocking(jar.get(UNLOCKING_COOKIE)?.value),
  };
}
