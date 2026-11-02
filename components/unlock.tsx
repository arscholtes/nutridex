"use client";

import { useActionState, useState, useTransition } from "react";
import { finishUnlock, uploadEncounters } from "../app/actions.ts";

export type UnlockCard = { slug: string; name: string; number: string; art: string; shape: string; color: string; compounds: number; effects: number };

/** New encounters waiting on this device, with the button that sends them home. */
export function UploadBanner({ count, needsPasscode }: { count: number; needsPasscode: boolean }) {
  const [state, action, uploading] = useActionState(uploadEncounters, { error: null });
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-[#ffd23f] px-3 py-2 sm:px-5">
      <p className="mr-auto font-bold">{count === 1 ? "1 new encounter to upload" : `${count} new encounters to upload`}</p>
      {needsPasscode && <input name="passcode" type="password" required aria-label="Upload passcode" placeholder="Upload passcode" autoComplete="current-password" className="min-w-0 rounded-lg border-2 border-ink bg-white px-2 py-1 text-sm" />}
      <button type="submit" disabled={uploading} className="rounded-lg border-2 border-ink bg-shell px-3 py-1 text-sm font-bold text-white hover:bg-shell-body disabled:opacity-60">
        {uploading ? "Uploading" : "Upload"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm font-bold text-[#7f1d1d]">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Plays each new unlock in turn. Next moves on, and the last one returns to the screen you were on. */
export function UnlockModal({ queue }: { queue: UnlockCard[] }) {
  const [at, setAt] = useState(0);
  const [finishing, startFinishing] = useTransition();
  const card = queue[at];
  const last = at === queue.length - 1;
  return (
    <div className="dex-unlock" role="dialog" aria-modal="true" aria-label={`Unlocked ${card.name}`}>
      <div className="dex-unlock-card" key={card.slug}>
        <div className="dex-unlock-stage">
          <div className="dex-unlock-rays" aria-hidden />
          <img className="dex-unlock-shape" src={card.shape} alt="" />
          <div className="dex-unlock-flash" aria-hidden />
          <img className="dex-unlock-art" src={card.art} alt="" />
        </div>
        <div className="dex-unlock-text p-4">
          <p className="text-2xl font-bold">Unlocked {card.name}</p>
          <p className="mt-1 font-readout text-lg">{card.number}</p>
          <p className="mt-1 text-sm">
            It reveals {card.compounds} compounds and {card.effects} effects.
          </p>
          <button
            type="button"
            autoFocus
            disabled={finishing}
            onClick={() => (last ? startFinishing(() => finishUnlock()) : setAt(at + 1))}
            className="mt-3 w-full rounded-lg border-2 border-ink bg-white px-4 py-2 font-bold text-ink hover:bg-[#ffd23f] disabled:opacity-60"
          >
            Next
          </button>
          {queue.length > 1 && (
            <p className="mt-2 text-xs">
              {at + 1} of {queue.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
