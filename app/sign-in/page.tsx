import Link from "next/link";
import { redirect } from "next/navigation";
import { GameShell } from "../../components/game.tsx";
import { ProviderButtons } from "../../components/provider-buttons.tsx";
import { SignInForm } from "../../components/sign-in-form.tsx";
import { providerProblem, signInConfigured, signInProviders } from "../../lib/auth/sign-in.ts";
import { signedIn } from "../../lib/viewer.ts";

/** Sign in, or make an account, through Google or Apple or with a code sent by email. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ problem?: string | string[] }> }) {
  if (await signedIn()) redirect("/settings");
  const providers = await signInProviders();
  const { problem } = await searchParams;
  const trouble = providerProblem(typeof problem === "string" ? problem : undefined);
  return (
    <GameShell>
      <main className="mx-auto max-w-5xl px-3.5 pb-8 pt-2">
        <h1 className="text-3xl font-bold">Sign in</h1>
        {signInConfigured() ? (
          <>
            <p className="mt-1 max-w-prose text-ink-soft">
              An account keeps your Dex and your skin, and brings them to any browser you sign in on. There is no password
              {providers.length > 0 ? ": continue with an account you already have, or enter your email and type the code we send" : ": enter your email and type the code we send"}.
              If you have no account yet, this makes one.
            </p>
            {trouble && (
              <p role="alert" className="mt-4 text-sm font-bold text-danger">
                {trouble}
              </p>
            )}
            {providers.length > 0 && (
              <>
                <ProviderButtons providers={providers} />
                <p className="mt-3 max-w-prose text-sm text-ink-soft">
                  The same email address is the same account, whichever way you come in.
                  {providers.includes("apple") && " If you hide your email from NutriDex when signing in with Apple, that is a separate account."}
                </p>
                <h2 className="mt-6 text-xl font-bold">Or use a code by email</h2>
              </>
            )}
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
