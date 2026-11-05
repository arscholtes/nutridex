import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { DexPager, DexStep } from "../lib/db/dex.ts";
import { DEFAULT_SKIN, skinOf, type Skin } from "../lib/skins.ts";
import { SwipeSteps } from "./swipe-steps.tsx";

/**
 * What every screen sits in: a page with the name and its links, and steps in a pill, or for the Yellow
 * version the original handheld and its D-pad. Both take a swipe.
 * @param skin [Skin] the look
 * @param lens [string] the Yellow version's lens colour, #RRGGBB; an entry passes its type colour
 * @param pager [DexPager] an entry's neighbours
 * @param locked [boolean] hides the way into the Dex, for the disclaimer
 */
export function DexShell({ skin = DEFAULT_SKIN, lens, pager, locked = false, children }: { skin?: Skin; lens?: string; pager?: DexPager; locked?: boolean; children: ReactNode }) {
  const page = skinOf(skin).shell === "handheld" ? <Handheld lens={lens} pager={pager} locked={locked}>{children}</Handheld> : <Page pager={pager} locked={locked}>{children}</Page>;
  return pager ? (
    <SwipeSteps prev={pager.prev?.href ?? null} next={pager.next?.href ?? null}>
      {page}
    </SwipeSteps>
  ) : (
    page
  );
}

function Page({ pager, locked, children }: { pager?: DexPager; locked: boolean; children: ReactNode }) {
  return (
    <div className="dex-page">
      <header className="dex-top">
        {locked ? (
          <span className="dex-wordmark">
            <span className="dex-dot" aria-hidden />
            NutriDex
          </span>
        ) : (
          <Link href="/" className="dex-wordmark" title="Back to the list">
            <span className="dex-dot" aria-hidden />
            NutriDex
          </Link>
        )}
        {!locked && (
          <span className="flex gap-2">
            <Link href="/skins" className="dex-round" aria-label="Skins" title="Skins">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 4l6 6-8.5 8.5a3 3 0 0 1-4.2 0l-1.8-1.8a3 3 0 0 1 0-4.2z" />
                <path d="M4 20h.01" />
              </svg>
              <span className="dex-round-label">Skins</span>
            </Link>
            <Link href="/sources" className="dex-round" aria-label="Sources" title="Sources">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
                <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
              </svg>
              <span className="dex-round-label">Sources</span>
            </Link>
          </span>
        )}
      </header>
      {children}
      {pager && <DexSteps pager={pager} />}
    </div>
  );
}

function Handheld({ lens, pager, locked, children }: { lens?: string; pager?: DexPager; locked: boolean; children: ReactNode }) {
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
              <span className="text-xl font-bold text-white sm:text-2xl">NutriDex</span>
            ) : (
              <Link href="/" className="text-xl font-bold text-white sm:text-2xl">
                NutriDex
              </Link>
            )}
          </div>
          {!locked && (
            <span className="ml-auto flex gap-3 pt-1 text-sm font-bold text-white">
              <Link href="/skins" className="underline-offset-4 hover:underline">
                Skins
              </Link>
              <Link href="/sources" className="underline-offset-4 hover:underline">
                Sources
              </Link>
            </span>
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
      <span className="dex-number block text-white">{step.number}</span>
      <span className="block truncate text-sm font-bold">{step.name}</span>
    </Link>
  );
}

/** A floating pill to step to an entry's neighbours, for anyone not swiping. */
function DexSteps({ pager }: { pager: DexPager }) {
  return (
    <nav className="dex-steps" aria-label="Step through the Dex">
      <Step step={pager.prev} label="Previous" end="First entry" glyph="‹" />
      <span className="px-1 text-sm font-bold tabular-nums">{pager.number}</span>
      <Step step={pager.next} label="Next" end="Last entry" glyph="›" />
    </nav>
  );
}

function Step({ step, label, end, glyph }: { step: DexStep | null; label: string; end: string; glyph: string }) {
  if (!step) {
    return (
      <span className="dex-step opacity-30" role="img" aria-label={end}>
        {glyph}
      </span>
    );
  }
  return (
    <Link href={step.href} className="dex-step" aria-label={`${label}: ${step.name}`} title={step.name}>
      {glyph}
    </Link>
  );
}
