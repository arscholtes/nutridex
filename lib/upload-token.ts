// The passcode that links someone's devices until NutriDex has accounts.
import { timingSafeEqual } from "node:crypto";

const json = (status: number, body: unknown) => Response.json(body, { status });

/** @return [Response | null] the refusal, or null when the request carries the upload token */
export function refusal(request: Request): Response | null {
  const expected = process.env.NUTRIDEX_UPLOAD_TOKEN;
  if (!expected) return json(503, { error: "this server has no upload token set, so it accepts no encounters" });
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return json(401, { error: "that upload token is not right" });
  return null;
}
