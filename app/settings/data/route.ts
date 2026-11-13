// Everything NutriDex stores about the signed-in person, as one file.
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../../lib/encounter-cookies.ts";
import { ownerRecord, sessionFor } from "../../../lib/db/sessions.ts";

/** Everything stored for the signed-in person, as a file. */
export async function GET(): Promise<Response> {
  const account = await sessionFor((await cookies()).get(SESSION_COOKIE)?.value);
  if (!account) return Response.json({ error: "sign in to download your data" }, { status: 401 });
  return Response.json({ email: account.email, ...(await ownerRecord(account.owner)) }, { headers: { "content-disposition": 'attachment; filename="nutridex-my-data.json"' } });
}
