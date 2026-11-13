import { caller, json } from "../../../../../lib/api/v1.ts";
import { ownerRecord } from "../../../../../lib/db/sessions.ts";

/** Everything stored for the signed-in person. */
export async function GET(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  return json(200, { email: who.email, ...(await ownerRecord(who.owner)) });
}
