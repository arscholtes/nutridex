import { caller, json, sent } from "../../../../../lib/api/v1.ts";
import { encounteredFoods } from "../../../../../lib/db/encounters.ts";
import { InvalidRecipe, ownedRecipes, saveRecipe } from "../../../../../lib/db/recipes.ts";
import { asDraft } from "../../../../../lib/recipe-draft.ts";

/** The recipes the signed-in person has saved. */
export async function GET(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  return json(200, { recipes: await ownedRecipes(who.owner) });
}

/** Saves a recipe built from foods the signed-in person owns. */
export async function POST(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  const draft = asDraft((await sent(request)).recipe);
  if (!draft) return json(400, { error: "send { recipe: { name, servings, ingredients, steps } }" });
  try {
    return json(201, { slug: await saveRecipe(draft, new Set(await encounteredFoods(who.owner)), who.owner) });
  } catch (error) {
    if (error instanceof InvalidRecipe) return json(422, { problems: error.problems });
    throw error;
  }
}
