// Small pieces every Dex screen uses: type badges, art, amount bars, source links and sections.
import Link from "next/link";
import type { ReactNode } from "react";
import type { MassUnit } from "epistasis";
import { compoundCreature, creatureDataUrl } from "../lib/art/creature.ts";
import { typeColor } from "../lib/art/palette.ts";
import type { Named, SourceRef } from "../lib/db/dex.ts";

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** @return [string] e.g. "8,285 µg" */
export function formatAmount(amount: number, unit: MassUnit): string {
  return `${NUMBER.format(amount)} ${unit}`;
}

/** A compound class, ingredient category or body system, in its type colour. */
export function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const color = typeColor(type);
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize"
      style={{ backgroundColor: `${color}26`, borderColor: `${color}66`, color }}
    >
      {type}
    </span>
  );
}

/**
 * An entry's creature: the drawn ingredient art, or a compound's creature drawn from its data.
 * @param size [number] pixels square
 */
export function EntryArt({ imageUrl, compound, size }: { imageUrl?: string | null; compound?: Named & { class: string | null }; size: number }) {
  const src = imageUrl ?? (compound ? creatureDataUrl(compoundCreature(compound)) : null);
  if (!src) return <div style={{ width: size, height: size }} className="shrink-0 rounded-2xl bg-neutral-800" aria-hidden />;
  return <img src={src} alt="" width={size} height={size} className="shrink-0" />;
}

/** A horizontal bar for a share from 0 to 1, with its label underneath. */
export function AmountBar({ share, color, label }: { share: number; color: string; label: string }) {
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.round(share * 100))}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

/** A source's title and year, linked when it has a URL, with its limitations on hover. */
export function SourceLink({ source }: { source: SourceRef }) {
  const text = `${source.title}${source.year ? ` (${source.year})` : ""}`;
  const title = source.limitations ? `Limitations: ${source.limitations}` : undefined;
  return source.url ? (
    <a href={source.url} title={title} className="text-neutral-400 underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200" target="_blank" rel="noreferrer">
      {text}
    </a>
  ) : (
    <span title={title} className="text-neutral-400">
      {text}
    </span>
  );
}

/** A link to another Dex entry. */
export function EntryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-neutral-100 underline decoration-neutral-600 underline-offset-4 hover:decoration-neutral-300">
      {children}
    </Link>
  );
}

/**
 * A titled section. With nothing to show it says why, rather than disappearing.
 * @param empty [string] what to say when the section has nothing in it
 */
export function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode[] | ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-neutral-100">{title}</h2>
      {items.length > 0 ? <div className="mt-3 space-y-3">{items}</div> : <p className="mt-2 text-sm text-neutral-500">{empty}</p>}
    </section>
  );
}

/** The sources behind everything on a page. */
export function SourcesSection({ sources }: { sources: SourceRef[] }) {
  return (
    <Section title="Sources" empty="Nothing on this page rests on a source yet.">
      {sources.length > 0 && (
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {sources.map((s) => (
            <li key={s.id}>
              <SourceLink source={s} />
              {s.studyType && <span className="text-neutral-600"> · {s.studyType}</span>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
