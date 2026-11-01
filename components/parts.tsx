// Small pieces every Dex screen uses: type badges, art, amount bars, source links and sections.
import Link from "next/link";
import type { ReactNode } from "react";
import type { Unit } from "epistasis";
import { compoundCreature, creatureDataUrl } from "../lib/art/creature.ts";
import { isDark, typeColor } from "../lib/art/palette.ts";
import type { Named, SourceRef } from "../lib/db/dex.ts";

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** @return [string] e.g. "8,285 µg" */
export function formatAmount(amount: number, unit: Unit): string {
  return `${NUMBER.format(amount)} ${unit}`;
}

/** A compound class, ingredient category or body system, ringed in its type colour. */
export function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <span className="inline-flex items-center rounded-full border-2 bg-white px-2.5 py-0.5 text-xs font-bold capitalize text-ink" style={{ borderColor: typeColor(type) }}>
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
  if (!src) return <div style={{ width: size, height: size }} className="shrink-0 rounded-2xl bg-line" aria-hidden />;
  return <img src={src} alt="" width={size} height={size} className="shrink-0" />;
}

/** An effect has no creature yet, so it stands on its initial in its type colour. */
export function EffectTile({ name, type }: { name: string; type: string | null }) {
  const color = typeColor(type);
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-white/85 text-6xl font-bold" style={{ color: isDark(color) ? color : "var(--color-ink)" }} aria-hidden>
      {name[0]}
    </div>
  );
}

/**
 * The panel an entry opens with: its number and art on its type colour, then its name.
 * @param number [string] its dex number
 * @param type [string | null] its type, which sets the colour
 * @param art [ReactNode] its creature or tile
 * @param name [string] its name
 * @param children [ReactNode] its badges and a line of context
 */
export function EntryViewer({ number, type, art, name, children }: { number: string; type: string | null; art: ReactNode; name: string; children: ReactNode }) {
  const color = typeColor(type);
  return (
    <header className="self-start md:sticky md:top-3">
      <div className="rounded-2xl border-2 border-ink p-3" style={{ backgroundColor: color, color: isDark(color) ? "#fff" : "var(--color-ink)" }}>
        <p className="font-readout text-3xl leading-none">{number}</p>
        <div className="mx-auto mt-2 max-w-40 md:max-w-60 [&>img]:h-auto [&>img]:w-full">{art}</div>
      </div>
      <h1 className="mt-3 text-3xl font-bold leading-tight">{name}</h1>
      <div className="mt-2 space-y-2">{children}</div>
    </header>
  );
}

/** A segmented meter for a share from 0 to 1, with an optional label underneath. */
export function AmountBar({ share, color, label }: { share: number; color: string; label: string }) {
  return (
    <div>
      <div className="dex-meter">
        <div className="h-full" style={{ width: `${share === 0 ? 0 : Math.max(2, Math.round(share * 100))}%`, backgroundColor: color }} />
      </div>
      {label && <p className="mt-1 text-xs text-ink-soft">{label}</p>}
    </div>
  );
}

/** A source's title and year, linked when it has a URL, with its limitations on hover. */
export function SourceLink({ source }: { source: SourceRef }) {
  const text = `${source.title}${source.year ? ` (${source.year})` : ""}`;
  const title = source.limitations ? `Limitations: ${source.limitations}` : undefined;
  return source.url ? (
    <a href={source.url} title={title} className="text-ink-soft underline decoration-line underline-offset-2 hover:text-ink" target="_blank" rel="noreferrer">
      {text}
    </a>
  ) : (
    <span title={title} className="text-ink-soft">
      {text}
    </span>
  );
}

/** A link to another Dex entry. */
export function EntryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-bold text-ink underline decoration-shell/50 decoration-2 underline-offset-4 hover:decoration-shell">
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
    <section>
      <SectionTitle>{title}</SectionTitle>
      {items.length > 0 ? <div className="mt-3 space-y-3">{items}</div> : <p className="mt-2 text-sm text-ink-soft">{empty}</p>}
    </section>
  );
}

/** A section's heading, as a tab on the screen. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="inline-block rounded-full bg-shell px-3 py-0.5 text-sm font-bold text-white">{children}</h2>;
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
              {s.studyType && <span className="text-ink-soft"> ({s.studyType})</span>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
