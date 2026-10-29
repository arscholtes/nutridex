import { typeColor } from "../lib/art/palette.ts";
import { hrefOf, type EffectEntry } from "../lib/db/dex.ts";
import { EffectCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { AmountBar, EntryArt, EntryLink, formatAmount, Section, SourcesSection, TypeBadge } from "./parts.tsx";

/** An effect's page: the compounds behind it, with their evidence, and the foods that carry them. */
export function EffectEntryView({ entry }: { entry: EffectEntry }) {
  const { effect } = entry;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold">{effect.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TypeBadge type={effect.bodySystem} />
          <span className="text-xs uppercase tracking-wide text-neutral-500">{effect.direction}</span>
          {entry.bestGrade && <GradeBadge grade={entry.bestGrade} limitations={null} />}
        </div>
      </header>

      <Section title="Compounds behind it" empty="No sourced compound reaches it yet.">
        {entry.compounds.map((c) => (
          <EffectCard key={`${c.compound.slug}:${c.source.id}`} claim={c} on="effect" />
        ))}
      </Section>

      {entry.foods.map(({ compound, ranked, unmeasured }) => (
        <Section key={compound.slug} title={`Foods richest in ${compound.name}, per 100 g`} empty={`No food in the Dex has a measured amount of ${compound.name}.`}>
          {ranked.map((f, i) => (
            <div key={f.slug} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <span className="w-6 text-right text-sm tabular-nums text-neutral-500">{i + 1}</span>
              <EntryArt imageUrl={f.imageUrl} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <EntryLink href={hrefOf("ingredient", f.slug)}>{f.name}</EntryLink>
                  <span className="text-sm tabular-nums text-neutral-300">{formatAmount(f.amount, f.unit)}</span>
                </div>
                <div className="mt-1.5">
                  <AmountBar share={f.share} color={typeColor(effect.bodySystem)} label="" />
                </div>
              </div>
            </div>
          ))}
          {unmeasured.length > 0 && <p className="text-sm text-neutral-500">Carried by, with no measured amount: {unmeasured.map((f) => f.name).join(", ")}.</p>}
        </Section>
      ))}
      {entry.foods.length > 0 && (
        <p className="mt-4 text-sm text-neutral-500">
          Ranked by amount. A goal score that weighs several compounds together needs a reference amount for each, and none is
          set yet; with one compound behind this effect, the order is the same either way.
        </p>
      )}

      <SourcesSection sources={entry.sources} />
    </main>
  );
}
