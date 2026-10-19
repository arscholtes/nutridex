// How each kind of claim reads on a Dex screen, with its grade, basis and source.
import type { AbsorptionFlag } from "epistasis";
import { hrefOf, type AbsorptionTip, type EffectClaim, type ModifierClaim, type PrepClaim } from "../lib/db/dex.ts";
import { BasisFrame } from "./basis-frame.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { EntryLink, SourceLink } from "./parts.tsx";

const STATUS: Record<AbsorptionFlag["status"], { label: string; style: string }> = {
  enhanced: { label: "Enhanced", style: "bg-emerald-500/15 text-emerald-300" },
  missed: { label: "Missed", style: "bg-amber-500/15 text-amber-300" },
  reduced: { label: "Reduced", style: "bg-rose-500/15 text-rose-300" },
  unknown: { label: "Unknown", style: "bg-neutral-500/15 text-neutral-300" },
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
      <p className="mt-2 text-sm text-neutral-300">{flag.reason}.</p>
      {flag.suggestion && <p className="mt-1 text-sm text-neutral-100">{flag.suggestion}.</p>}
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
    <span className="font-semibold text-neutral-100">{claim.condition}</span>
  );
  return (
    <BasisFrame basis={claim.basis} className={claim.className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-400">{claim.direction === "enhances" ? "Helped by" : "Hindered by"}</span>
        {by}
        <GradeBadge grade={claim.grade} limitations={claim.source.limitations} />
      </div>
      {claim.magnitude && <p className="mt-2 text-sm text-neutral-300">{claim.magnitude}.</p>}
      {claim.mechanism && <p className="mt-1 text-sm text-neutral-400">{claim.mechanism}.</p>}
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-sm">
        <span className="font-semibold capitalize text-neutral-100">{claim.method}</span>
        <span className="text-neutral-400">: </span>
        {showCompound && (
          <>
            <EntryLink href={hrefOf("compound", claim.compound.slug)}>{claim.compound.name}</EntryLink>{" "}
          </>
        )}
        <span className="text-neutral-300">{change}</span>
      </p>
      {claim.note && <p className="mt-1 text-sm text-neutral-400">{claim.note}.</p>}
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {on === "effect" ? (
          <EntryLink href={hrefOf("compound", claim.compound.slug)}>{claim.compound.name}</EntryLink>
        ) : (
          <EntryLink href={hrefOf("effect", claim.effect.slug)}>{claim.effect.name}</EntryLink>
        )}
        {on === "ingredient" && <span className="text-sm text-neutral-500">via {claim.compound.name}</span>}
        {on !== "effect" && <span className="text-xs uppercase tracking-wide text-neutral-500">{claim.effect.direction}</span>}
        <GradeBadge grade={claim.grade} limitations={claim.source.limitations} />
      </div>
      {claim.summary && <p className="mt-2 text-sm text-neutral-300">{claim.summary}</p>}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {claim.doseContext && (
          <>
            <dt className="text-neutral-500">Dose</dt>
            <dd className="text-neutral-300">{claim.doseContext}</dd>
          </>
        )}
        {claim.onset && (
          <>
            <dt className="text-neutral-500">Onset</dt>
            <dd className="text-neutral-300">{claim.onset}</dd>
          </>
        )}
      </dl>
      <p className="mt-2 text-xs">
        <SourceLink source={claim.source} />
      </p>
    </div>
  );
}
