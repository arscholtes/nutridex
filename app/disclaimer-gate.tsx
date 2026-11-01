import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ACCEPTANCE_COOKIE, appVersion, needsAcceptance } from "../lib/disclaimer/gate.ts";
import { DISCLAIMER_INTRO, DISCLAIMER_SECTIONS, DISCLAIMER_TITLE } from "../lib/disclaimer/text.ts";
import { DexShell } from "../components/dex-shell.tsx";
import { acceptDisclaimer } from "./actions.ts";

/** Shows the disclaimer in place of any page until this device has accepted the running version. */
export async function DisclaimerGate({ children }: { children: ReactNode }) {
  const version = appVersion();
  const accepted = (await cookies()).get(ACCEPTANCE_COOKIE)?.value;
  if (!needsAcceptance(accepted, version)) return <>{children}</>;

  return (
    <DexShell locked>
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{DISCLAIMER_TITLE}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {DISCLAIMER_INTRO} Version {version}.
      </p>
      <div className="mt-8 space-y-6">
        {DISCLAIMER_SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="font-bold">{s.heading}</h2>
            <p className="mt-1 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
      <form action={acceptDisclaimer} className="mt-10">
        <button
          type="submit"
          className="w-full rounded-lg border-2 border-ink bg-shell px-4 py-3 font-bold text-white hover:bg-shell-body sm:w-auto"
        >
          I understand and agree
        </button>
      </form>
    </main>
    </DexShell>
  );
}
