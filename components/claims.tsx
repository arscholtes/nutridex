// How each kind of claim reads on a Dex screen, with its grade, basis and source.
import type { AbsorptionFlag } from "epistasis";
import { hrefOf, type AbsorptionTip, type EffectClaim, type ModifierClaim, type PrepClaim } from "../lib/db/dex.ts";
import { BasisFrame } from "./basis-frame.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { EntryLink, SourceLink } from "./parts.tsx";

const STATUS: Record<AbsorptionFlag["status"], { label: string; style: string }> = {
  enhanced: { label: "Enhanced", style: "bg-emerald-100 text-emerald-900" },
  missed: { label: "Missed", style: "bg-amber-200 text-amber-950" },
  reduced: { label: "Reduced", style: "bg-rose-100 text-rose-900" },
  unknown: { label: "Unknown", style: "bg-neutral-200 text-neutral-800" },
};

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
    <div className="rounded-xl border-2 border-line bg-card p-3">
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
 * What a compound does, with the dose and onset its source reports.
 * @param on [string] the page it sits on: an effect's names the compound, the others name the effect
 */
export function EffectCard({ claim, on }: { claim: EffectClaim; on: "effect" | "compound" | "ingredient" }) {
  return (
    <div className="rounded-xl border-2 border-line bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {on === "effect" ? (
          <EntryLink href={hrefOf("compound", claim.compound.slug)}>{claim.compound.name}</EntryLink>
        ) : (
          <EntryLink href={hrefOf("effect", claim.effect.slug)}>{claim.effect.name}</EntryLink>
        )}
        {on === "ingredient" && <span className="text-sm text-ink-soft">via {claim.compound.name}</span>}
        {on !== "effect" && <span className="text-xs font-bold capitalize text-ink-soft">{claim.effect.direction}</span>}
        <GradeBadge grade={claim.grade} limitations={claim.source.limitations} />
      </div>
      {claim.summary && <p className="mt-2 text-sm">{claim.summary}</p>}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {claim.doseContext && (
          <>
            <dt className="text-ink-soft">Dose</dt>
            <dd>{claim.doseContext}</dd>
          </>
        )}
        {claim.onset && (
          <>
            <dt className="text-ink-soft">Onset</dt>
            <dd>{claim.onset}</dd>
          </>
        )}
      </dl>
      <p className="mt-2 text-xs">
        <SourceLink source={claim.source} />
      </p>
    </div>
  );
}
