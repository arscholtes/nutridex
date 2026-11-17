import { json, nothing, sent } from "../../../../../lib/api/v1.ts";
import { requestCode } from "../../../../../lib/auth/sign-in.ts";

/** Emails a six-digit sign-in code, making the account if the address has none. */
export async function POST(request: Request): Promise<Response> {
  const { email } = await sent(request);
  if (typeof email !== "string") return json(400, { error: "send { email }" });
  const problem = await requestCode(email);
  return problem ? json(422, { error: problem }) : nothing();
}
