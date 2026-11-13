"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { recordEncounters } from "../lib/db/encounters.ts";
import { redirect } from "next/navigation";
import { beginSession, PROOF_MINUTES } from "../lib/auth/begin-session.ts";
import { cookedCatches } from "../lib/cook-along.ts";
import { parseProvider, providerStart, requestCode, verifyCode } from "../lib/auth/sign-in.ts";
import { saveSkin } from "../lib/db/preferences.ts";
import { InvalidRecipe, recipePage, saveRecipe, type RecipeDraft } from "../lib/db/recipes.ts";
import { endSession, eraseOwner, removeSignIn } from "../lib/db/sessions.ts";
import { ACCEPTANCE_COOKIE, appVersion } from "../lib/disclaimer/gate.ts";
import { parsePending, parseUnlocking, PENDING_COOKIE, privateCookie, PROOF_COOKIE, SESSION_COOKIE, SKIN_COOKIE, UNLOCKING_COOKIE, withPending } from "../lib/encounter-cookies.ts";
import { parseSkin } from "../lib/skins.ts";
import { signedIn, viewer } from "../lib/viewer.ts";

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

  await beginSession(await cookies(), proven);
  redirect("/");
}

/** Sends the browser to Google or Apple by way of the sign-in service, keeping the proof the callback will need. */
export async function signInWith(form: FormData) {
  const provider = parseProvider(form.get("provider"));
  const origin = (await headers()).get("origin");
  if (!provider || !origin) throw new Error(`sign-in: cannot start a provider sign-in (provider ${String(form.get("provider"))}, origin ${origin})`);
  const { url, verifier } = providerStart(provider, origin);
  (await cookies()).set(PROOF_COOKIE, verifier, { ...privateCookie, maxAge: PROOF_MINUTES * 60 });
  redirect(url);
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

/**
 * Says a recipe was cooked: every food in it is had, in that recipe. Signed in, that goes on your record and counts
 * as cooking each food; otherwise this browser holds the foods as had, which is all it can hold.
 * @param slug [string] the recipe's slug
 * @return [Promise<{ error: string | null; kept: "account" | "browser" | null }>] where it was kept, or why it was not
 */
export async function cookedRecipe(slug: string): Promise<{ error: string | null; kept: "account" | "browser" | null }> {
  const jar = await cookies();
  const account = await signedIn();
  const page = await recipePage(slug);
  if (!page || (page.owner !== null && page.owner !== account?.owner)) return { error: "That recipe is not here any more.", kept: null };
  const catches = cookedCatches(page, new Date().toISOString());
  if (account) {
    const { added, unknown, misplaced } = await recordEncounters(catches, account.owner);
    if (unknown.length > 0 || misplaced.length > 0) throw new Error(`cooking ${slug} named what the Dex does not hold: ${[...unknown, ...misplaced].join(", ")}`);
    if (added.length > 0) jar.set(UNLOCKING_COOKIE, JSON.stringify([...parseUnlocking(jar.get(UNLOCKING_COOKIE)?.value), ...added]), privateCookie);
    return { error: null, kept: "account" };
  }
  let pending = parsePending(jar.get(PENDING_COOKIE)?.value);
  for (const { food, encounteredAt } of catches) {
    if (pending.some((p) => p.food === food)) continue;
    const value = withPending(pending, food, encounteredAt);
    if (value === null) return { error: "This browser is full: sign in to save what it holds, then carry on.", kept: null };
    jar.set(PENDING_COOKIE, value, privateCookie);
    pending = parsePending(value);
  }
  return { error: null, kept: "browser" };
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

/**
 * Saves a recipe built on the web, as the signed-in person's own.
 * @param draft [RecipeDraft] what was built
 * @return [Promise<{ slug: string } | { problems: string[] }>] the saved recipe, or every reason it was refused
 */
export async function saveRecipeAction(draft: RecipeDraft): Promise<{ slug: string } | { problems: string[] }> {
  const { revealed, account } = await viewer();
  if (!account) return { problems: ["Sign in to save a recipe. Building and previewing work without an account."] };
  try {
    const slug = await saveRecipe(draft, revealed.foods, account.owner);
    revalidatePath("/recipes");
    return { slug };
  } catch (error) {
    if (error instanceof InvalidRecipe) return { problems: error.problems };
    throw error;
  }
}
