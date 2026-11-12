"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { recordEncounters } from "../lib/db/encounters.ts";
import { redirect } from "next/navigation";
import { requestCode, verifyCode } from "../lib/auth/sign-in.ts";
import { savedSkin, saveSkin } from "../lib/db/preferences.ts";
import { endSession, eraseOwner, removeSignIn, SESSION_DAYS, startSession } from "../lib/db/sessions.ts";
import { ACCEPTANCE_COOKIE, appVersion } from "../lib/disclaimer/gate.ts";
import { parsePending, parseUnlocking, PENDING_COOKIE, SESSION_COOKIE, SKIN_COOKIE, UNLOCKING_COOKIE, withPending } from "../lib/encounter-cookies.ts";
import { parseSkin } from "../lib/skins.ts";
import { signedIn } from "../lib/viewer.ts";

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

/**
 * Marks a food as had. Signed in, it goes straight onto your record; otherwise this browser keeps it.
 * @param food [string] the food's slug
 * @return [Promise<{ error: string | null }>] why it was not kept
 */
export async function markEncountered(food: string): Promise<{ error: string | null }> {
  const jar = await cookies();
  const account = await signedIn();
  if (account) {
    const { added, unknown } = await recordEncounters([{ food, encounteredAt: new Date().toISOString() }], account.owner);
    if (unknown.length > 0) return { error: "That is not a food in the Dex." };
    if (added.length > 0) jar.set(UNLOCKING_COOKIE, JSON.stringify([...parseUnlocking(jar.get(UNLOCKING_COOKIE)?.value), ...added]), privateCookie);
    return { error: null };
  }
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  if (pending.some((p) => p.food === food)) return { error: null };
  const value = withPending(pending, food, new Date().toISOString());
  if (value === null) return { error: "This browser is full: sign in to save what it holds, then carry on." };
  jar.set(PENDING_COOKIE, value, privateCookie);
  return { error: null };
}

export type SignInState = { step: "email" | "code"; email: string; error: string | null };

/**
 * Both halves of signing in: with an email alone it sends a code; with the code too it checks it, starts
 * a session, and moves what this browser was holding onto the account.
 */
export async function signIn(_previous: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "");
  const code = form.get("code");
  if (typeof code !== "string") {
    const error = await requestCode(email);
    return error ? { step: "email", email, error } : { step: "code", email, error: null };
  }
  const proven = await verifyCode(email, code);
  if ("error" in proven) return { step: "code", email, error: proven.error };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await startSession(proven.id, proven.email), { ...privateCookie, maxAge: SESSION_DAYS * 24 * 60 * 60 });
  const pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  const { added, unknown } = await recordEncounters(pending, proven.id);
  if (unknown.length > 0) console.error(`sign-in: this browser held foods the Dex does not have, so none were saved: ${unknown.join(", ")}`);
  jar.delete(PENDING_COOKIE);
  if (added.length > 0) jar.set(UNLOCKING_COOKIE, JSON.stringify(added), privateCookie);
  const here = parseSkin(jar.get(SKIN_COOKIE)?.value);
  if (here && (await savedSkin(proven.id)) === null) await saveSkin(here, proven.id);
  redirect("/");
}

/** Signs this browser out. What was saved stays on the account. */
export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await endSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

/** Deletes the signed-in person's account and every row they own. */
export async function deleteAccount() {
  const account = await signedIn();
  if (!account) redirect("/sign-in");
  await eraseOwner(account.owner);
  await removeSignIn(account.owner);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

/** Ends the unlock animation, leaving you on the screen you were on. */
export async function finishUnlock() {
  (await cookies()).delete(UNLOCKING_COOKIE);
}

/** Changes the look in this browser, and on your account when you are signed in. */
export async function chooseSkin(id: string) {
  const skin = parseSkin(id);
  if (!skin) throw new Error(`NutriDex has no skin called ${id}`);
  (await cookies()).set(SKIN_COOKIE, skin, privateCookie);
  const account = await signedIn();
  if (account) await saveSkin(skin, account.owner);
  revalidatePath("/", "layout");
}
