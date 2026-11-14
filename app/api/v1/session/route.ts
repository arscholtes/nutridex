import { bearer, caller, json, nothing, sent } from "../../../../lib/api/v1.ts";
import { exchangeCode, parseProvider, PROVIDER_PROBLEMS, type Proven, verifyCode, verifyIdToken } from "../../../../lib/auth/sign-in.ts";
import { endSession, SESSION_DAYS, startSession } from "../../../../lib/db/sessions.ts";

/**
 * Signs an app in: with an emailed code, with the identity token Apple or Google gave it, or with the code its system
 * sign-in sheet brought back and the secret it kept.
 */
export async function POST(request: Request): Promise<Response> {
  const { email, code, provider, idToken, nonce, codeVerifier } = await sent(request);
  const named = parseProvider(provider);
  const proven =
    typeof email === "string" && typeof code === "string"
      ? await verifyCode(email, code)
      : typeof code === "string" && typeof codeVerifier === "string"
        ? await fromSheet(code, codeVerifier)
        : named && typeof idToken === "string" && (nonce === undefined || typeof nonce === "string")
          ? await verifyIdToken(named, idToken, nonce)
          : null;
  if (!proven) return json(400, { error: "send { email, code }, { provider, idToken, nonce } with provider apple or google, or { code, codeVerifier }" });
  if ("error" in proven) return json(401, { error: proven.error });
  const token = await startSession(proven.id, proven.email);
  return json(200, { token, email: proven.email, expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString() });
}

/** Signs this device out. What was saved stays on the account. */
export async function DELETE(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  await endSession(bearer(request)!);
  return nothing();
}

async function fromSheet(code: string, codeVerifier: string): Promise<Proven | { error: string }> {
  const proven = await exchangeCode(code, codeVerifier);
  return "problem" in proven ? { error: PROVIDER_PROBLEMS[proven.problem] } : proven;
}
