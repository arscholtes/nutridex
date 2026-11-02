// The one way any app reads or writes what someone has encountered.
import { timingSafeEqual } from "node:crypto";
import { encounterRows, recordEncounters } from "../../../lib/db/encounters.ts";

const json = (status: number, body: unknown) => Response.json(body, { status });

/** @return [Response | null] the refusal, or null when the request carries the upload token */
function refusal(request: Request): Response | null {
  const expected = process.env.NUTRIDEX_UPLOAD_TOKEN;
  if (!expected) return json(503, { error: "this server has no upload token set, so it accepts no encounters" });
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return json(401, { error: "that upload token is not right" });
  return null;
}

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
  const items = body.encounters as { food?: unknown; encounteredAt?: unknown }[];
  const valid = items.every((i) => typeof i?.food === "string" && typeof i?.encounteredAt === "string" && !Number.isNaN(Date.parse(i.encounteredAt)));
  if (!valid) return json(400, { error: "each encounter needs a food and an encounteredAt date" });
  const { added, unknown } = await recordEncounters(items as { food: string; encounteredAt: string }[]);
  if (unknown.length > 0) return json(422, { error: `not foods in the Dex: ${unknown.join(", ")}` });
  return json(200, { new: added, encounters: await encounterRows() });
}
