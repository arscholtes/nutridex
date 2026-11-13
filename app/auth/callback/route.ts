// Where the sign-in service sends someone back after Google or Apple has vouched for them.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { beginSession } from "../../../lib/auth/begin-session.ts";
import { exchangeCode } from "../../../lib/auth/sign-in.ts";
import { PROOF_COOKIE } from "../../../lib/encounter-cookies.ts";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const jar = await cookies();
  const verifier = jar.get(PROOF_COOKIE)?.value;
  jar.delete(PROOF_COOKIE);
  if (!code || !verifier) redirect("/sign-in?problem=unfinished");
  const proven = await exchangeCode(code, verifier);
  if ("problem" in proven) redirect(`/sign-in?problem=${proven.problem}`);
  await beginSession(jar, proven);
  redirect("/");
}
