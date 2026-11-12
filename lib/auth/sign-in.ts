// The sign-in service: Supabase Auth, asked only to email someone a code and to check the code they type.
// NutriDex keeps its own sessions (lib/db/sessions.ts), so nothing here outlives the request.

export type Proven = { id: string; email: string };

const settings = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
};

/** @return [boolean] whether this server has a sign-in service to ask */
export function signInConfigured(): boolean {
  return settings() !== null;
}

const tidy = (email: string) => email.trim().toLowerCase();

async function ask(path: string, body: Record<string, unknown>): Promise<{ status: number; body: { error_code?: string; user?: { id?: string; email?: string } } | null }> {
  const s = settings();
  if (!s) throw new Error("sign-in is not set up: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not both set");
  const res = await fetch(`${s.url}/auth/v1/${path}`, { method: "POST", headers: { apikey: s.key, "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/**
 * Emails a six-digit code, making the account if this address has none.
 * @param email [string] where to send it
 * @return [Promise<string | null>] what to tell the person when it was not sent, or null when it was
 */
export async function requestCode(email: string): Promise<string | null> {
  const address = tidy(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return "That does not look like an email address.";
  const { status, body } = await ask("otp", { email: address, create_user: true });
  if (status === 200) return null;
  if (status === 429) return "Codes are being sent too fast. Wait a minute, then try again.";
  console.error(`sign-in: the service refused to send a code (${status} ${body?.error_code ?? "no code"})`);
  return "The code could not be sent. Try again in a minute.";
}

/**
 * @param email [string] the address the code was sent to
 * @param code [string] what the person typed
 * @return [Promise<Proven | { error: string }>] who they are, or what to tell them
 */
export async function verifyCode(email: string, code: string): Promise<Proven | { error: string }> {
  const { status, body } = await ask("verify", { type: "email", email: tidy(email), token: code.trim() });
  const user = body?.user;
  if (status === 200 && user?.id && user.email) return { id: user.id, email: user.email };
  if (status !== 200 && status < 500) return { error: "That code is not right, or it is too old. Ask for a new one." };
  console.error(`sign-in: the service could not check a code (${status} ${body?.error_code ?? "no code"})`);
  return { error: "The code could not be checked. Try again in a minute." };
}
