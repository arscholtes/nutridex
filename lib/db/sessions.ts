// Who is signed in, and everything one signed-in person owns. Reading and writing sessions happens only here.
import { createHash, randomBytes } from "node:crypto";
import { sql } from "./client.ts";
import { encounterRows, type EncounterRow } from "./encounters.ts";
import { savedSkin } from "./preferences.ts";
import { ownedRecipes, type RecipeDraft } from "./recipes.ts";
import type { Skin } from "../skins.ts";

type Sql = typeof sql;

export type Session = { owner: string; email: string };

export const SESSION_DAYS = 90;

// The browser holds the token and the database holds only its hash, so a copy of this table signs nobody in.
const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * @param owner [string] the person, as the sign-in service knows them
 * @param email [string] the address they just proved
 * @return [Promise<string>] the token for this browser to keep
 */
export async function startSession(owner: string, email: string, q: Sql = sql): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await q`insert into session (token_hash, owner_id, email, expires_at) values (${hashOf(token)}, ${owner}, ${email}, now() + make_interval(days => ${SESSION_DAYS}))`;
  return token;
}

/** @return [Promise<Session | null>] who a browser's token belongs to, or null when it is missing, ended or expired */
export async function sessionFor(token: string | undefined, q: Sql = sql): Promise<Session | null> {
  if (!token) return null;
  const [row] = await q<Session[]>`select owner_id as owner, email from session where token_hash = ${hashOf(token)} and expires_at > now()`;
  return row ?? null;
}

/** Signs one browser out. */
export async function endSession(token: string, q: Sql = sql): Promise<void> {
  await q`delete from session where token_hash = ${hashOf(token)}`;
}

/** @return [Promise<{ encounters: EncounterRow[]; skin: Skin | null }>] everything stored for one person */
export async function ownerRecord(owner: string, q: Sql = sql): Promise<{ encounters: EncounterRow[]; skin: Skin | null; recipes: (RecipeDraft & { slug: string })[] }> {
  return { encounters: await encounterRows(owner, q), skin: await savedSkin(owner, q), recipes: await ownedRecipes(owner, q) };
}

/** Removes every row one person owns, and signs them out everywhere. */
export async function eraseOwner(owner: string, q: Sql = sql): Promise<void> {
  await q.begin(async (tx) => {
    await tx`delete from encounter where owner_id = ${owner}`;
    await tx`delete from preference where owner_id = ${owner}`;
    await tx`delete from recipe where owner_id = ${owner}`;
    await tx`delete from session where owner_id = ${owner}`;
  });
}

/** Removes someone from the sign-in service, whose users live in this database's auth schema. */
export async function removeSignIn(owner: string, q: Sql = sql): Promise<void> {
  await q`delete from auth.users where id = ${owner}`;
}
