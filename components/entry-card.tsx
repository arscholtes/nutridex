import Link from "next/link";
import { typeColor } from "../lib/art/palette.ts";
import type { EntryCard } from "../lib/db/dex.ts";
import { GradeBadge } from "./grade-badge.tsx";
import { EntryArt, TypeBadge } from "./parts.tsx";

/** One Dex card: art, name, type badge, evidence badge and two stats from real data. */
export function EntryCardView({ card }: { card: EntryCard }) {
  return (
    <Link href={card.href} className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-3 transition hover:border-neutral-600">
      {card.kind === "effect" ? (
        <div
          className="flex aspect-square w-full items-center justify-center rounded-2xl text-4xl font-black text-neutral-950"
          style={{ backgroundColor: typeColor(card.type) }}
          aria-hidden
        >
          {card.name[0]}
        </div>
      ) : (
        <div className="aspect-square w-full [&>img]:h-full [&>img]:w-full">
          <EntryArt imageUrl={card.imageUrl} compound={card.kind === "compound" ? { slug: card.slug, name: card.name, class: card.compoundClass } : undefined} size={160} />
        </div>
      )}
      <div className="mt-3 flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight">{card.name}</span>
        {card.bestGrade && <GradeBadge grade={card.bestGrade} limitations={null} />}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{card.kind}</span>
        <TypeBadge type={card.type} />
      </div>
      <ul className="mt-2 space-y-0.5 text-xs text-neutral-400">
        {card.stats.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Link>
  );
}
