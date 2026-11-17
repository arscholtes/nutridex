"use client";

import { useFormStatus } from "react-dom";
import { signInWith } from "../app/actions.ts";
import type { Provider } from "../lib/auth/sign-in.ts";

const NAMES: Record<Provider, string> = { google: "Google", apple: "Apple" };

const MARKS: Record<Provider, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#000"
        d="M12.27 9.56c-.02-1.82 1.49-2.7 1.56-2.74-.85-1.24-2.17-1.41-2.64-1.43-1.12-.11-2.19.66-2.76.66-.57 0-1.45-.64-2.38-.63-1.22.02-2.35.71-2.98 1.8-1.27 2.2-.32 5.46.91 7.25.61.87 1.33 1.85 2.27 1.82.91-.04 1.26-.59 2.36-.59 1.1 0 1.41.59 2.38.57.98-.02 1.6-.89 2.2-1.77.69-1.01.98-1.99.99-2.04-.02-.01-1.9-.73-1.92-2.9zM10.45 4.2c.5-.61.84-1.46.75-2.3-.72.03-1.6.48-2.12 1.09-.47.54-.87 1.4-.76 2.23.8.06 1.63-.41 2.13-1.02z"
      />
    </svg>
  ),
};

function Buttons({ providers }: { providers: Provider[] }) {
  const { pending, data } = useFormStatus();
  const chosen = pending ? data?.get("provider") : null;
  return providers.map((p) => (
    <button key={p} type="submit" name="provider" value={p} disabled={pending} aria-busy={chosen === p} className="provider-button">
      {MARKS[p]}
      <span>{chosen === p ? `Opening ${NAMES[p]}` : `Continue with ${NAMES[p]}`}</span>
    </button>
  ));
}

/** One button for each way in the sign-in service has switched on. Pressing one leaves for that provider. */
export function ProviderButtons({ providers }: { providers: Provider[] }) {
  return (
    <form action={signInWith} className="mt-5 flex max-w-sm flex-col gap-3">
      <Buttons providers={providers} />
    </form>
  );
}
