import { caller, json, sent } from "../../../../../lib/api/v1.ts";
import { encounteredFoods } from "../../../../../lib/db/encounters.ts";
import { draftPage } from "../../../../../lib/db/recipes.ts";
import { asDraft } from "../../../../../lib/recipe-draft.ts";

/** The engine's grid and profile for a recipe still being built, without saving it. */
export async function POST(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  const draft = asDraft((await sent(request)).recipe);
  if (!draft) return json(400, { error: "send { recipe: { name, servings, ingredients, steps } }" });
  const page = await draftPage(draft, new Set(await encounteredFoods(who.owner)));
  return "problems" in page ? json(422, { problems: page.problems }) : json(200, page);
}
