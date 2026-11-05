// Small pieces every Dex screen uses: type badges, art, amount bars, source links and sections.
import { readFileSync } from "node:fs";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Unit } from "epistasis";
import { compoundCreature, creatureDataUrl, creatureSilhouette } from "../lib/art/creature.ts";
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
    <span className="dex-type-badge inline-flex items-center border-2 bg-card px-2.5 py-0.5 text-xs font-bold capitalize text-ink" style={{ borderColor: typeColor(type) }}>
      {type}
    </span>
  );
}

/**
 * An entry's creature: the drawn ingredient art, or a compound's creature drawn from its data.
 * @param size [number] pixels square
 * @param cutout [boolean] leaves out the tile and shadow, so the creature stands directly on a card
 */
export function EntryArt({ imageUrl, compound, size, cutout = false }: { imageUrl?: string | null; compound?: Named & { class: string | null }; size: number; cutout?: boolean }) {
  const src = cutout ? cutoutSrc(imageUrl, compound) : (imageUrl ?? (compound ? creatureDataUrl(compoundCreature(compound)) : null));
  if (!src) return <div style={{ width: size, height: size }} className="shrink-0 rounded-2xl bg-line" aria-hidden />;
  return <img src={src} alt="" width={size} height={size} className="shrink-0" />;
}

function cutoutSrc(imageUrl?: string | null, compound?: Named & { class: string | null }): string | null {
  const svg = imageUrl ? readFileSync(`public${imageUrl}`, "utf8") : compound ? compoundCreature(compound) : null;
  return svg && creatureDataUrl(creatureSilhouette(svg));
}

/** An effect has no creature yet, so it stands on its initial in its type colour. */
export function EffectTile({ name, type }: { name: string; type: string | null }) {
  const color = typeColor(type);
  return (
    <div className="dex-effect-letter flex aspect-square w-full items-center justify-center rounded-2xl text-6xl font-bold" style={{ "--letter": isDark(color) ? color : "var(--color-ink)" } as CSSProperties} aria-hidden>
      {name[0]}
    </div>
  );
}

/**
 * The panel an entry opens with: its creature on the skin's stage, with its number and name.
 * @param number [string] its dex number
 * @param type [string | null] its type, whose colour the Yellow version paints the panel
 * @param art [ReactNode] its creature or tile
 * @param name [string] its name
 * @param children [ReactNode] its badges and a line of context
 */
export function EntryViewer({ number, type, art, name, children }: { number: string; type: string | null; art: ReactNode; name: string; children: ReactNode }) {
  const color = typeColor(type);
  return (
    <header className="dex-viewer self-start md:sticky md:top-3">
      <div className="dex-foil dex-holo-card p-5" style={{ "--type": color, "--on-type": isDark(color) ? "#fff" : "var(--color-ink)" } as CSSProperties}>
        <p className="dex-number dex-number-on-card">{number}</p>
        <div className="mx-auto max-w-60 drop-shadow-[0_10px_12px_rgb(33_27_78_/_0.28)] [&>img]:h-auto [&>img]:w-full">{art}</div>
      </div>
      <p className="dex-number dex-number-under-card mt-3 text-sm font-bold tabular-nums text-ink-soft">{number}</p>
      <h1 className="dex-viewer-name mt-1 text-3xl font-bold leading-tight">{name}</h1>
      <div className="dex-viewer-details mt-2 space-y-2">{children}</div>
    </header>
  );
}

/** A bar for a share from 0 to 1, with an optional label underneath. */
export function AmountBar({ share, color, label, className }: { share: number; color?: string; label: string; className?: string }) {
  return (
    <div>
      <div className="dex-meter">
        <div className={`h-full ${className ?? ""}`} style={{ width: `${share === 0 ? 0 : Math.max(2, Math.round(share * 100))}%`, backgroundColor: color }} />
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
    <Link href={href} className="dex-link font-bold text-ink underline decoration-accent/50 decoration-2 underline-offset-4 hover:decoration-accent">
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

/** A section's heading, drawn the way the skin draws them. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="dex-section-title text-xl font-bold">{children}</h2>;
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
