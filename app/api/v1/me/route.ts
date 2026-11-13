import { caller, json, nothing } from "../../../../lib/api/v1.ts";
import { ownedFoods } from "../../../../lib/db/encounters.ts";
import { savedSkin } from "../../../../lib/db/preferences.ts";
import { eraseOwner, removeSignIn } from "../../../../lib/db/sessions.ts";
import { rankOf } from "../../../../lib/tiers.ts";

/** The signed-in person's game: their foods with tiers, their rank and their skin. */
export async function GET(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  const foods = await ownedFoods(who.owner);
  // No badge can be earned yet, so rank rests on foods caught alone.
  return json(200, { email: who.email, skin: await savedSkin(who.owner), rank: rankOf({ caught: foods.length, badges: 0 })?.name ?? null, foods });
}

/** Deletes the account and every row it owns. */
export async function DELETE(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  await eraseOwner(who.owner);
  await removeSignIn(who.owner);
  return nothing();
}
