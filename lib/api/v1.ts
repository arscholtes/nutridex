// What every /api/v1 route shares: how a caller proves who they are, and how answers are shaped.
import { sessionFor, type Session } from "../db/sessions.ts";

export const json = (status: number, body: unknown) => Response.json(body, { status });
export const nothing = () => new Response(null, { status: 204 });

/** @return [string | undefined] the bearer token a request carries */
export const bearer = (request: Request): string | undefined => request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];

/**
 * @param request [Request] a call that needs a signed-in person
 * @return [Promise<Session | Response>] who is asking, or the refusal to send back
 */
export async function caller(request: Request): Promise<Session | Response> {
  return (await sessionFor(bearer(request))) ?? json(401, { error: "sign in first: send the session token as a bearer token" });
}

/** @return [Promise<Record<string, unknown>>] the JSON object a request carries; anything else reads as an empty one */
export async function sent(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}
