// What this visitor may see: what this device has marked, and what it has uploaded if it holds the passcode.
import { cookies } from "next/headers";
import { encounteredFoods, revealedEntries, type Revealed } from "./db/encounters.ts";
import { parsePending, parseUnlocking, PENDING_COOKIE, tokenMatches, UNLOCKING_COOKIE, UPLOAD_COOKIE, type PendingEncounter } from "./encounter-cookies.ts";

export type Viewer = { revealed: Revealed; pending: PendingEncounter[]; canUpload: boolean; unlocking: string[] };

/** @return [Promise<Viewer>] this visitor's game; the uploaded record is a personal fact, so only the passcode reads it */
export async function viewer(): Promise<Viewer> {
  const jar = await cookies();
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  const configured = process.env.NUTRIDEX_UPLOAD_TOKEN;
  const canUpload = Boolean(configured) && tokenMatches(jar.get(UPLOAD_COOKIE)?.value ?? "", configured!);
  const uploaded = canUpload ? await encounteredFoods() : [];
  return {
    revealed: await revealedEntries([...new Set([...uploaded, ...pending.map((p) => p.food)])]),
    pending,
    canUpload,
    unlocking: parseUnlocking(jar.get(UNLOCKING_COOKIE)?.value),
  };
}
