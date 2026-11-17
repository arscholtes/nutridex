// The sign-in service: Supabase Auth, asked to email someone a code and check it, or to vouch for someone who
// signed in with Google or Apple. NutriDex keeps its own sessions (lib/db/sessions.ts), so nothing here outlives the request.
import { createHash, randomBytes } from "node:crypto";

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

const required = () => {
  const s = settings();
  if (!s) throw new Error("sign-in is not set up: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not both set");
  return s;
};

async function ask(path: string, body: Record<string, unknown>): Promise<{ status: number; body: { error_code?: string; user?: { id?: string; email?: string } } | null }> {
  const s = required();
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

export const PROVIDERS = ["google", "apple"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** @return [Provider | null] the provider a form or address named, or null for anything else */
export const parseProvider = (value: unknown): Provider | null => PROVIDERS.find((p) => p === value) ?? null;

/** @return [Promise<Provider[]>] the providers the service has switched on; none when it cannot say */
export async function signInProviders(): Promise<Provider[]> {
  const s = settings();
  if (!s) return [];
  const res = await fetch(`${s.url}/auth/v1/settings`, { headers: { apikey: s.key } });
  const body: { external?: Record<string, boolean> } | null = await res.json().catch(() => null);
  const external = res.ok ? body?.external : undefined;
  if (!external) {
    console.error(`sign-in: the service did not say which providers are on (${res.status})`);
    return [];
  }
  return PROVIDERS.filter((p) => external[p] === true);
}

/**
 * The first half of signing in through a provider. The verifier stays in this browser; only its hash goes out,
 * so a code that comes back is useless to anyone else (RFC 7636).
 * @param provider [Provider] who will vouch for the person
 * @param origin [string] this site's own origin, where the service sends them back
 * @return [{ url: string; verifier: string }] where to send the browser, and the secret to keep for the callback
 */
export function providerStart(provider: Provider, origin: string): { url: string; verifier: string } {
  const verifier = randomBytes(32).toString("base64url");
  const query = new URLSearchParams({
    provider,
    redirect_to: `${origin}/auth/callback`,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "s256",
  });
  return { url: `${required().url}/auth/v1/authorize?${query}`, verifier };
}

/** What to tell someone whose provider sign-in did not land, by the name the callback puts in the address. */
export const PROVIDER_PROBLEMS = {
  "no-email": "That account did not share an email address, and NutriDex needs one to know it is you.",
  unfinished: "That sign-in did not finish. Try again.",
} as const;
export type ProviderProblem = keyof typeof PROVIDER_PROBLEMS;

/** @return [string | null] the sentence for a problem named in an address, or null for any other text someone put there */
export const providerProblem = (name: string | undefined): string | null =>
  name !== undefined && Object.hasOwn(PROVIDER_PROBLEMS, name) ? PROVIDER_PROBLEMS[name as ProviderProblem] : null;

/**
 * The second half: trades the code the service sent back for who the person is.
 * @param code [string] what arrived at the callback
 * @param verifier [string] the secret this browser kept from providerStart
 * @return [Promise<Proven | { problem: ProviderProblem }>] who they are, or why not
 */
export async function exchangeCode(code: string, verifier: string): Promise<Proven | { problem: ProviderProblem }> {
  const { status, body } = await ask("token?grant_type=pkce", { auth_code: code, code_verifier: verifier });
  const user = body?.user;
  if (status === 200 && user?.id && user.email) return { id: user.id, email: user.email };
  if (status === 200) return { problem: "no-email" };
  if (status >= 500) console.error(`sign-in: the service could not finish a provider sign-in (${status} ${body?.error_code ?? "no code"})`);
  return { problem: "unfinished" };
}
