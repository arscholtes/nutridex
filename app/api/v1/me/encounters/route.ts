import { caller, json, sent } from "../../../../../lib/api/v1.ts";
import { ownedFoods, parseCatchItems, recordEncounters } from "../../../../../lib/db/encounters.ts";

/** Stores each time a food was had, and answers with which foods were new and the whole record after it. */
export async function POST(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  const items = parseCatchItems((await sent(request)).encounters);
  if (!items) return json(400, { error: "send { encounters: [{ food, encounteredAt, form }] }; form is optional: raw, juiced or cooked" });
  const { added, unknown } = await recordEncounters(items, who.owner);
  if (unknown.length > 0) return json(422, { error: `not foods in the Dex: ${unknown.join(", ")}` });
  return json(200, { new: added, foods: await ownedFoods(who.owner) });
}
