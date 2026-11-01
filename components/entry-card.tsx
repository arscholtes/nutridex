import Link from "next/link";
import { isDark, typeColor } from "../lib/art/palette.ts";
import type { EntryCard } from "../lib/db/dex.ts";
import { GradeBadge } from "./grade-badge.tsx";
import { EffectTile, EntryArt, TypeBadge } from "./parts.tsx";

/** One Dex card on its type colour: number, art, name, type badge, evidence badge and stats from real data. */
export function EntryCardView({ card }: { card: EntryCard }) {
  const color = typeColor(card.type);
  return (
    <Link href={card.href} className="dex-card flex flex-col rounded-2xl border-2 border-ink p-2.5" style={{ backgroundColor: color, color: isDark(color) ? "#fff" : "var(--color-ink)" }}>
      <div className="mb-1.5 flex min-h-6 items-center justify-between gap-2">
        <span className="font-readout text-xl leading-none">{card.number}</span>
        {card.bestGrade && <GradeBadge grade={card.bestGrade} limitations={null} />}
      </div>
      {card.kind === "effect" ? (
        <EffectTile name={card.name} type={card.type} />
      ) : (
        <div className="aspect-square w-full [&>img]:h-full [&>img]:w-full">
          <EntryArt imageUrl={card.imageUrl} compound={card.kind === "compound" ? { slug: card.slug, name: card.name, class: card.compoundClass } : undefined} size={160} />
        </div>
      )}
      <span className="mt-2 font-bold leading-tight">{card.name}</span>
      <div className="mt-1.5">
        <TypeBadge type={card.type} />
      </div>
      <ul className="mt-1.5 space-y-0.5 text-xs font-medium">
        {card.stats.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Link>
  );
}
