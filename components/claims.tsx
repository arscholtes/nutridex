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
 * What compounds do, each with the dose and onset its source reports. A source behind several claims
 * is cited once, under them, with any bar they share.
 * @param claims [EffectClaim[]] in display order
 * @param on [string] the page it sits on: an effect's names the compound, a compound's names the effect
 */
export function EffectList({ claims, on }: { claims: EffectClaim[]; on: "effect" | "compound" }) {
  return [...Map.groupBy(claims, (c) => c.source.id).values()].map((group) => {
    const shared = group.length > 1 && group.every((c) => c.doseContext === group[0].doseContext) ? group[0].doseContext : null;
    return (
      <div key={group[0].source.id} className="rounded-xl border-2 border-line bg-card p-3">
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
 * What a food does: one line per effect, naming the nutrients behind it, with each claim's exact
 * wording and source a click away.
 * @param claims [EffectClaim[]] the claims that apply to this food
 */
export function FoodEffects({ claims }: { claims: EffectClaim[] }) {
  return (
    <ul className="divide-y divide-line rounded-xl border-2 border-line bg-card px-3">
      {[...Map.groupBy(claims, (c) => c.effect.slug).values()].map((group) => {
        const { effect } = group[0];
        return (
          <li key={effect.slug} className="py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <EntryLink href={hrefOf("effect", effect.slug)}>{effect.name}</EntryLink>
              {effect.direction !== "benefit" && <span className="text-xs font-bold capitalize text-ink-soft">{effect.direction}</span>}
              <GradeBadge grade={group.reduce((best, c) => (c.grade < best ? c.grade : best), group[0].grade)} limitations={null} />
              <span className="text-sm text-ink-soft">
                via{" "}
                {group.map((c, i) => (
                  <span key={c.compound.slug}>
                    {i > 0 && ", "}
                    <EntryLink href={hrefOf("compound", c.compound.slug)}>{c.compound.name}</EntryLink>
                  </span>
                ))}
              </span>
            </div>
            <details className="mt-1 text-sm">
              <summary className="cursor-pointer text-ink-soft hover:text-ink">What the source says</summary>
              <ul className="mt-1.5 space-y-2">
                {group.map((c) => (
                  <li key={c.compound.slug}>
                    {c.summary && <p>{c.summary}</p>}
                    <ClaimFacts doseContext={c.doseContext} onset={c.onset} isBar={c.minFoodPer100g !== null} />
                    <p className="mt-1 text-xs">
                      <SourceLink source={c.source} />
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
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
