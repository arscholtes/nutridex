// How each kind of claim reads on a Dex screen, with its grade, basis and source.
import type { AbsorptionFlag, CautionFlag } from "epistasis";
import Link from "next/link";
import type { CSSProperties } from "react";
import { typeColor } from "../lib/art/palette.ts";
import { hrefOf, type AbsorptionTip, type EffectClaim, type ModifierClaim, type PrepClaim } from "../lib/db/dex.ts";
import type { BentoTile } from "../lib/db/effect-tiles.ts";
import { BasisFrame } from "./basis-frame.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { EntryArt, EntryLink, SourceLink } from "./parts.tsx";

const STATUS: Record<AbsorptionFlag["status"], { label: string; style: string }> = {
  enhanced: { label: "Enhanced", style: "bg-emerald-100 text-emerald-900" },
  missed: { label: "Missed", style: "bg-amber-200 text-amber-950" },
  reduced: { label: "Reduced", style: "bg-rose-100 text-rose-900" },
  unknown: { label: "Unknown", style: "bg-neutral-200 text-neutral-800" },
};

/** An engine caution, on a food or a recipe: what to watch, its grade, and any advice. */
export function CautionCard({ caution }: { caution: CautionFlag }) {
  return (
    <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-3 text-sm text-neutral-900">
      <div className="flex items-center gap-2">
        <span className="font-bold capitalize text-rose-900">{caution.kind}</span>
        {caution.grade && <GradeBadge grade={caution.grade} limitations={null} />}
      </div>
      <p className="mt-1">{caution.summary}</p>
      {caution.advice && <p className="mt-1 font-medium">{caution.advice}</p>}
    </div>
  );
}

/** An engine absorption flag on a food: what happens to one compound, and what would help. */
export function AbsorptionTipCard({ tip }: { tip: AbsorptionTip }) {
  const { flag } = tip;
  const status = STATUS[flag.status];
  return (
    <BasisFrame basis={flag.basis} className={tip.className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${status.style}`}>{status.label}</span>
        <EntryLink href={hrefOf("compound", tip.compound.slug)}>{tip.compound.name}</EntryLink>
        <GradeBadge grade={flag.grade} limitations={tip.sources[0]?.limitations ?? null} />
      </div>
      <p className="mt-2 text-sm">{flag.reason}.</p>
      {flag.suggestion && <p className="mt-1 text-sm font-bold">{flag.suggestion}.</p>}
      {tip.sources.map((s) => (
        <p key={s.id} className="mt-2 text-xs">
          <SourceLink source={s} />
        </p>
      ))}
    </BasisFrame>
  );
}

/** An absorption rule on a compound: what helps or hinders it, how much, and why. */
export function ModifierCard({ claim }: { claim: ModifierClaim }) {
  const by = claim.modifierCompound ? (
    <EntryLink href={hrefOf("compound", claim.modifierCompound.slug)}>{claim.modifierCompound.name}</EntryLink>
  ) : (
    <span className="font-bold">{claim.condition}</span>
  );
  return (
    <BasisFrame basis={claim.basis} className={claim.className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-soft">{claim.direction === "enhances" ? "Helped by" : "Hindered by"}</span>
        {by}
        <GradeBadge grade={claim.grade} limitations={claim.source.limitations} />
      </div>
      {claim.magnitude && <p className="mt-2 text-sm">{claim.magnitude}.</p>}
      {claim.mechanism && <p className="mt-1 text-sm text-ink-soft">{claim.mechanism}.</p>}
      <p className="mt-2 text-xs">
        <SourceLink source={claim.source} />
      </p>
    </BasisFrame>
  );
}

/** How one prep method changes one compound. */
export function PrepCard({ claim, showCompound }: { claim: PrepClaim; showCompound: boolean }) {
  const change =
    claim.retentionFactor !== null ? `keeps ${Math.round(claim.retentionFactor * 100)}%` : claim.direction ? claim.direction : "changes by an amount no source gives";
  return (
    <div className="dex-panel p-3">
      <p className="text-sm">
        <span className="font-bold capitalize">{claim.method}</span>
        <span className="text-ink-soft">: </span>
        {showCompound && (
          <>
            <EntryLink href={hrefOf("compound", claim.compound.slug)}>{claim.compound.name}</EntryLink>{" "}
          </>
        )}
        <span>{change}</span>
      </p>
      {claim.note && <p className="mt-1 text-sm text-ink-soft">{claim.note}.</p>}
      <p className="mt-2 text-xs">
        <SourceLink source={claim.source} />
      </p>
    </div>
  );
}

/**
 * What compounds do, each with the dose and onset its source reports. A source behind several claims
 * is cited once, under them, with any bar they share.
 * @param claims [EffectClaim[]] in display order
 * @param on [string] the page it sits on: an effect's names the compound, a compound's names the effect
 */
export function EffectList({ claims, on }: { claims: EffectClaim[]; on: "effect" | "compound" }) {
  return [...Map.groupBy(claims, (c) => c.source.id).values()].map((group) => {
    const shared = group.length > 1 && group.every((c) => c.doseContext === group[0].doseContext) ? group[0].doseContext : null;
    return (
      <div key={group[0].source.id} className="dex-panel p-3">
        <ul className="divide-y divide-line">
          {group.map((c) => (
            <li key={`${c.effect.slug}:${c.compound.slug}`} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                {on === "effect" ? <EntryLink href={hrefOf("compound", c.compound.slug)}>{c.compound.name}</EntryLink> : <EntryLink href={hrefOf("effect", c.effect.slug)}>{c.effect.name}</EntryLink>}
                {on !== "effect" && c.effect.direction !== "benefit" && <span className="text-xs font-bold capitalize text-ink-soft">{c.effect.direction}</span>}
                <GradeBadge grade={c.grade} limitations={c.source.limitations} />
              </div>
              {c.summary && <p className="mt-1 text-sm">{c.summary}</p>}
              <ClaimFacts doseContext={shared ? null : c.doseContext} onset={c.onset} isBar={c.minFoodPer100g !== null} />
            </li>
          ))}
        </ul>
        {shared && <p className="mt-2 border-t border-line pt-2 text-sm text-ink-soft">{shared}</p>}
        <p className="mt-2 text-xs">
          <SourceLink source={group[0].source} />
        </p>
      </div>
    );
  });
}

/**
 * What a food does, as a grid: the more of your daily amount behind an effect, the bigger its tile and
 * the more it says. Its source's exact wording and citation are one tap away, on the effect's page.
 * @param tiles [BentoTile[]] biggest first
 */
export function EffectBento({ tiles }: { tiles: BentoTile[] }) {
  return (
    <ul className="dex-bento">
      {tiles.map((tile) => (
        <li key={tile.effect.slug} className={`dex-tile dex-tile-${tile.size}`} style={{ "--wash": `color-mix(in srgb, ${typeColor(tile.effect.bodySystem)} 14%, white)` } as CSSProperties}>
          <Link href={hrefOf("effect", tile.effect.slug)} className="flex h-full flex-col gap-1.5 p-3.5">
            {tile.size === "large" ? <LargeTile tile={tile} /> : tile.size === "wide" ? <WideTile tile={tile} /> : <SmallTile tile={tile} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

function TileName({ tile }: { tile: BentoTile }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 font-bold leading-tight">
      {tile.effect.name}
      {tile.effect.direction !== "benefit" && <span className="text-xs capitalize opacity-70">{tile.effect.direction}</span>}
      <GradeBadge grade={tile.grade} limitations={null} />
    </span>
  );
}

/** The creatures behind a tile, the ones supplying more of your daily amount drawn larger. */
function TileCreatures({ tile, most }: { tile: BentoTile; most: number }) {
  return (
    <span className="flex flex-wrap items-end gap-1">
      {tile.compounds.slice(0, most).map((c) => (
        <span key={c.slug} title={c.name} className="[&>img]:h-full [&>img]:w-full" style={{ width: creatureSize(c.dailyShare), height: creatureSize(c.dailyShare) }}>
          <EntryArt compound={c} size={creatureSize(c.dailyShare)} cutout />
        </span>
      ))}
      {tile.compounds.length > most && <span className="pb-1 text-xs font-bold opacity-70">+{tile.compounds.length - most}</span>}
    </span>
  );
}

function creatureSize(share: number | null): number {
  return (share ?? 0) >= 1 ? 52 : (share ?? 0) >= 0.4 ? 42 : 32;
}

function SmallTile({ tile }: { tile: BentoTile }) {
  return (
    <>
      <TileCreatures tile={tile} most={3} />
      <span className="mt-auto" />
      {tile.topShare !== null && <span className="text-lg font-bold tabular-nums leading-none">{percent(tile.topShare)}</span>}
      <TileName tile={tile} />
    </>
  );
}

function WideTile({ tile }: { tile: BentoTile }) {
  const leading = tile.compounds[0];
  return (
    <>
      <span className="flex items-start justify-between gap-2">
        {tile.topShare !== null && (
          <span>
            <span className="block text-4xl font-bold tabular-nums leading-none">{percent(tile.topShare)}</span>
            <span className="text-xs opacity-80">of your daily {leading.name} in 100 g</span>
          </span>
        )}
        <TileCreatures tile={tile} most={4} />
      </span>
      {tile.dose && <span className="text-xs opacity-80">Studied at: {tile.dose}</span>}
      <span className="mt-auto" />
      <TileName tile={tile} />
    </>
  );
}

function LargeTile({ tile }: { tile: BentoTile }) {
  const leading = tile.compounds[0];
  return (
    <>
      <span className="flex items-start justify-between gap-2">
        <span>
          <span className="dex-holo-text block text-6xl font-bold tabular-nums leading-none">{percent(tile.topShare!)}</span>
          <span className="mt-1 block text-sm opacity-90">of your daily {leading.name} in 100 g</span>
        </span>
        <span className="h-24 w-24 shrink-0 [&>img]:h-full [&>img]:w-full" title={leading.name}>
          <EntryArt compound={leading} size={96} cutout />
        </span>
      </span>
      {tile.compounds.length > 1 && <TileCreatures tile={{ ...tile, compounds: tile.compounds.slice(1) }} most={5} />}
      <span className="mt-auto" />
      <TileName tile={tile} />
      {tile.wording && <span className="text-sm opacity-90">{tile.wording}</span>}
    </>
  );
}

/**
 * A claim's dose and onset, where its source gives them.
 * @param isBar [boolean] the context states what a food must supply, which is not a dose someone takes
 */
function ClaimFacts({ doseContext, onset, isBar }: { doseContext: string | null; onset: string | null; isBar: boolean }) {
  if (isBar) return doseContext ? <p className="mt-1 text-sm text-ink-soft">{doseContext}</p> : null;
  if (!doseContext && !onset) return null;
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {doseContext && (
        <>
          <dt className="text-ink-soft">Dose</dt>
          <dd>{doseContext}</dd>
        </>
      )}
      {onset && (
        <>
          <dt className="text-ink-soft">Onset</dt>
          <dd>{onset}</dd>
        </>
      )}
    </dl>
  );
}
