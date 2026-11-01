import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { DexPager, DexStep } from "../lib/db/dex.ts";

/**
 * The handheld every screen sits in: lens and lights on the top plate, the screen, and a control deck.
 * @param lens [string] the lens colour, #RRGGBB; an entry passes its type colour
 * @param pager [DexPager] an entry's neighbours, which give it a control deck
 * @param locked [boolean] hides the way into the Dex, for the disclaimer
 */
export function DexShell({ lens, pager, locked = false, children }: { lens?: string; pager?: DexPager; locked?: boolean; children: ReactNode }) {
  return (
    <div className="dex-shell" style={lens ? ({ "--lens": lens } as CSSProperties) : undefined}>
      <header className="dex-plate-edge">
        <div className="dex-plate">
          <div className="dex-lens" aria-hidden />
          <div className="min-w-0 pt-0.5">
            <div className="flex gap-2 pb-1.5" aria-hidden>
              <span className="dex-light bg-[#ff5a52]" />
              <span className="dex-light bg-[#ffd23f]" />
              <span className="dex-light bg-[#52d273]" />
            </div>
            {locked ? (
              <span className="text-xl font-bold text-white sm:text-2xl">Foodi Dex</span>
            ) : (
              <Link href="/" className="text-xl font-bold text-white sm:text-2xl">
                Foodi Dex
              </Link>
            )}
          </div>
          {!locked && (
            <Link href="/sources" className="ml-auto pt-1 text-sm font-bold text-white underline-offset-4 hover:underline">
              Sources
            </Link>
          )}
        </div>
      </header>
      <div className="dex-bezel">
        <div className="dex-screen">{children}</div>
      </div>
      {pager && <DexDeck pager={pager} />}
    </div>
  );
}

/** Previous and next entry either side of a D-pad, whose up arrow goes back to the list. */
function DexDeck({ pager }: { pager: DexPager }) {
  return (
    <nav className="dex-deck" aria-label="Step through the Dex">
      <DeckStep step={pager.prev} label="Previous" align="right" />
      <div className="dex-dpad" aria-hidden>
        <span className="!bg-transparent" />
        <Link href="/" tabIndex={-1} className="rounded-t" title="Back to the list">
          ▲
        </Link>
        <span className="!bg-transparent" />
        <PadArrow step={pager.prev} glyph="◀" className="rounded-l" />
        <span />
        <PadArrow step={pager.next} glyph="▶" className="rounded-r" />
        <span className="!bg-transparent" />
        <span data-off className="rounded-b">
          ▼
        </span>
        <span className="!bg-transparent" />
      </div>
      <DeckStep step={pager.next} label="Next" align="left" />
    </nav>
  );
}

function PadArrow({ step, glyph, className }: { step: DexStep | null; glyph: string; className: string }) {
  if (!step) {
    return (
      <span data-off className={className}>
        {glyph}
      </span>
    );
  }
  return (
    <Link href={step.href} tabIndex={-1} className={className}>
      {glyph}
    </Link>
  );
}

function DeckStep({ step, label, align }: { step: DexStep | null; label: string; align: "left" | "right" }) {
  const alignment = align === "right" ? "text-right" : "text-left";
  if (!step) return <span className={`text-xs font-bold text-white/70 ${alignment}`}>{label === "Next" ? "Last entry" : "First entry"}</span>;
  return (
    <Link href={step.href} className={`min-w-0 hover:underline ${alignment}`} aria-label={`${label}: ${step.name}`}>
      <span className="block font-readout text-lg leading-none text-white">{step.number}</span>
      <span className="block truncate text-sm font-bold">{step.name}</span>
    </Link>
  );
}
