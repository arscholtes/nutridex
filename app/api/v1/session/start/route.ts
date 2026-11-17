import { APP_RETURN, authorizeUrl, isChallenge, parseProvider } from "../../../../../lib/auth/sign-in.ts";

/** Starts an app's sign-in in the system sheet: the app keeps the secret, and the sheet comes back to the app. */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const provider = parseProvider(query.get("provider"));
  const challenge = query.get("challenge");
  // Response.json, not lib/api/v1's json: this call reads no session, so it loads nothing that reaches the database.
  if (!provider || !isChallenge(challenge)) {
    return Response.json({ error: "send provider (apple or google) and challenge, the S256 hash of a secret the app keeps" }, { status: 400 });
  }
  return new Response(null, { status: 302, headers: { location: authorizeUrl(provider, APP_RETURN, challenge) } });
}
