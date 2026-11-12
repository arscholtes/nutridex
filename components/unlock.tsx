"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { finishUnlock, markEncountered } from "../app/actions.ts";

export type UnlockCard = { slug: string; name: string; number: string; art: string; compounds: number; effects: number };

/** Foods this browser is holding for someone who has not signed in, with the way to keep them. */
export function SaveBanner({ count }: { count: number }) {
  return (
    <p className="dex-foil dex-upload mx-3 mt-2 flex flex-wrap items-center gap-2 rounded-[1.75rem] py-1.5 pl-4 pr-1.5 sm:mx-3.5">
      <span className="mr-auto basis-full font-bold sm:basis-auto">{count === 1 ? "1 food is kept in this browser only" : `${count} foods are kept in this browser only`}</span>
      <Link href="/sign-in" className="dex-button">
        Sign in to save your Dex
      </Link>
    </p>
  );
}

/** "I've had this" for one food, which says so when this browser can hold no more. */
export function HadButton({ slug, name }: { slug: string; name: string }) {
  const [state, action, marking] = useActionState(() => markEncountered(slug), { error: null });
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button type="submit" disabled={marking} className="dex-button" aria-label={`I've had ${name}`}>
        I've had this
      </button>
      {state.error && (
        <p role="alert" className="text-right text-sm font-bold text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** @return [string] what an unlock brought with it, in plain English */
export function revealSummary(compounds: number, effects: number): string {
  const counted = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return `It reveals ${counted(compounds, "compound")} and ${counted(effects, "effect")}.`;
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
        <div className="dex-foil dex-unlock-stage">
          <div className="dex-unlock-rays" aria-hidden />
          <img className="dex-unlock-shape" src={card.art} alt="" />
          <div className="dex-unlock-flash" aria-hidden />
          <img className="dex-unlock-art" src={card.art} alt="" />
        </div>
        <div className="dex-unlock-text p-4">
          <p className="text-2xl font-bold">Unlocked {card.name}</p>
          <p className="dex-number mt-1 font-bold tabular-nums">{card.number}</p>
          <p className="mt-1 text-sm">
            {revealSummary(card.compounds, card.effects)}
          </p>
          <button
            type="button"
            autoFocus
            disabled={finishing}
            onClick={() => (last ? startFinishing(() => finishUnlock()) : setAt(at + 1))}
            className="dex-button mt-3 w-full"
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
