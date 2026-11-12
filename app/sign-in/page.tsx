import Link from "next/link";
import { redirect } from "next/navigation";
import { GameShell } from "../../components/game.tsx";
import { SignInForm } from "../../components/sign-in-form.tsx";
import { signInConfigured } from "../../lib/auth/sign-in.ts";
import { signedIn } from "../../lib/viewer.ts";

/** Sign in, or make an account, with a code sent by email. */
export default async function SignInPage() {
  if (await signedIn()) redirect("/settings");
  return (
    <GameShell>
      <main className="mx-auto max-w-5xl px-3.5 pb-8 pt-2">
        <h1 className="text-3xl font-bold">Sign in</h1>
        {signInConfigured() ? (
          <>
            <p className="mt-1 max-w-prose text-ink-soft">
              An account keeps your Dex and your skin, and brings them to any browser you sign in on. There is no password: enter your email and
              type the code we send. If you have no account yet, this makes one.
            </p>
            <SignInForm />
          </>
        ) : (
          <p className="mt-1 text-ink-soft">This server has no sign-in set up, so your Dex stays in this browser.</p>
        )}
        <p className="mt-6 text-sm">
          <Link href="/" className="font-bold underline underline-offset-4">
            Back to the list
          </Link>
        </p>
      </main>
    </GameShell>
  );
}
