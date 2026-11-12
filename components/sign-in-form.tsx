"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../app/actions.ts";

const START: SignInState = { step: "email", email: "", error: null };

/** Email first, then the six-digit code that was sent to it. */
export function SignInForm() {
  const [state, action, busy] = useActionState(signIn, START);
  const asking = state.step === "email";
  return (
    <form action={action} className="mt-5 flex max-w-sm flex-col gap-3">
      {asking ? (
        <label className="flex flex-col gap-1 font-bold">
          Email
          <input name="email" type="email" required autoComplete="email" defaultValue={state.email} className="dex-field" />
        </label>
      ) : (
        <>
          <input type="hidden" name="email" value={state.email} />
          <p>
            A six-digit code is on its way to <strong>{state.email}</strong>. It can take a minute.
          </p>
          <label className="flex flex-col gap-1 font-bold">
            Code
            <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className="dex-field tabular-nums" />
          </label>
        </>
      )}
      <button type="submit" disabled={busy} className="dex-button self-start">
        {asking ? (busy ? "Sending" : "Email me a code") : busy ? "Checking" : "Sign in"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
