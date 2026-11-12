import Link from "next/link";
import { GameShell } from "../../components/game.tsx";
import { signInConfigured } from "../../lib/auth/sign-in.ts";
import { SKINS } from "../../lib/skins.ts";
import { currentSkin, signedIn, viewer } from "../../lib/viewer.ts";
import { deleteAccount, signOut } from "../actions.ts";

/** Your skin and your account, in one place. */
export default async function SettingsPage() {
  const { skin } = await currentSkin();
  const account = await signedIn();
  const { pending } = await viewer();
  const wearing = SKINS.find((s) => s.id === skin);
  return (
    <GameShell>
      <main className="mx-auto max-w-5xl px-3.5 pb-8 pt-2">
        <h1 className="text-3xl font-bold">Settings</h1>

        <section className="mt-6">
          <h2 className="text-xl font-bold">Skin</h2>
          <p className="mt-1">
            Wearing <strong>{wearing?.name}</strong>.{" "}
            <Link href="/skins" className="font-bold underline underline-offset-4">
              Change skin
            </Link>
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">Account</h2>
          {account ? (
            <>
              <p className="mt-1">
                Signed in as <strong>{account.email}</strong>. Your Dex and your skin are saved to this account.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={signOut}>
                  <button type="submit" className="dex-button">
                    Sign out
                  </button>
                </form>
                <a href="/settings/data" download="nutridex-my-data.json" className="dex-button">
                  Download my data
                </a>
              </div>
              <details className="mt-6">
                <summary className="cursor-pointer font-bold text-danger">Delete my account</summary>
                <p className="mt-2 max-w-prose">This removes your account, every food you have unlocked and your saved skin. It cannot be undone.</p>
                <form action={deleteAccount} className="mt-2">
                  <button type="submit" className="dex-button">
                    Delete my account and everything in it
                  </button>
                </form>
              </details>
            </>
          ) : signInConfigured() ? (
            <>
              <p className="mt-1 max-w-prose">
                {pending.length > 0 ? "What you have unlocked is kept in this browser only." : "You are not signed in."} An account saves your Dex and your skin and
                brings them to any browser you sign in on.
              </p>
              <p className="mt-3">
                <Link href="/sign-in" className="dex-button">
                  Sign in or make an account
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-1 text-ink-soft">This server has no sign-in set up, so your Dex stays in this browser.</p>
          )}
        </section>
      </main>
    </GameShell>
  );
}
