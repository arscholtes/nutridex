// The wall on the web: every entry in number order, in colour once unlocked and blacked out until then.
import { readFileSync } from "node:fs";
import { blackoutShape, compoundCreature, creatureDataUrl } from "../lib/art/creature.ts";
import type { EntryCard, WallSlot } from "../lib/db/dex.ts";
import { EntryCardView } from "./entry-card.tsx";

/** A card nobody has unlocked yet: its number and its shape, and nothing that names it. */
export function LockedCardView({ slot }: { slot: WallSlot }) {
  const svg = slot.kind === "effect" ? null : slot.imageUrl ? readFileSync(`public${slot.imageUrl}`, "utf8") : compoundCreature({ slug: slot.slug, name: slot.name, class: slot.compoundClass });
  return (
    <div className="dex-card dex-card-locked flex flex-col p-2.5" role="img" aria-label={`${slot.number}, not unlocked yet`}>
      <div className="mb-1.5 flex min-h-6 items-center">
        <span className="dex-number text-sm font-bold tabular-nums">{slot.number}</span>
      </div>
      <div className="dex-card-art dex-blackout-stage flex aspect-square w-full items-center justify-center [&>img]:h-full [&>img]:w-full">
        {svg ? <img src={creatureDataUrl(blackoutShape(svg))} alt="" width={320} height={320} className="dex-blackout" /> : <span className="dex-blackout-letter" aria-hidden>?</span>}
      </div>
      <span className="mt-2 font-bold leading-tight text-ink-soft" aria-hidden>
        ???
      </span>
    </div>
  );
}

/** One page of the wall. */
export function WallView({ slots, unlocked }: { slots: WallSlot[]; unlocked: EntryCard[] }) {
  const mine = new Map(unlocked.map((c) => [`${c.kind}:${c.slug}`, c]));
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {slots.map((slot) => {
        const card = mine.get(`${slot.kind}:${slot.slug}`);
        return card ? <EntryCardView key={slot.number} card={card} /> : <LockedCardView key={slot.number} slot={slot} />;
      })}
    </div>
  );
}
