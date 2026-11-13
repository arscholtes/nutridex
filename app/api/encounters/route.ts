// The one way any app reads or writes what someone has encountered.
import { encounterRows, parseCatchItems, recordEncounters } from "../../../lib/db/encounters.ts";
import { refusal } from "../../../lib/upload-token.ts";

const json = (status: number, body: unknown) => Response.json(body, { status });

/** Every uploaded encounter. */
export async function GET(request: Request): Promise<Response> {
  return refusal(request) ?? json(200, { encounters: await encounterRows() });
}

/** Stores an array of newly encountered foods and says which were new. */
export async function POST(request: Request): Promise<Response> {
  const refused = refusal(request);
  if (refused) return refused;
  const body = (await request.json().catch(() => null)) as { encounters?: unknown } | null;
  if (!Array.isArray(body?.encounters)) return json(400, { error: "send { encounters: [{ food, encounteredAt }] }" });
  const items = parseCatchItems(body.encounters);
  if (!items) return json(400, { error: "each encounter needs a food and an encounteredAt date; form, when sent, is raw, juiced or cooked" });
  const { added, unknown } = await recordEncounters(items);
  if (unknown.length > 0) return json(422, { error: `not foods in the Dex: ${unknown.join(", ")}` });
  return json(200, { new: added, encounters: await encounterRows() });
}
