import { typeColor } from "../lib/art/palette.ts";
import { hrefOf, type EffectEntry } from "../lib/db/dex.ts";
import { EffectCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { AmountBar, EffectTile, EntryArt, EntryLink, EntryViewer, formatAmount, Section, SourcesSection, TypeBadge } from "./parts.tsx";

/** An effect's page: the compounds behind it, with their evidence, and the foods that carry them. */
export function EffectEntryView({ entry }: { entry: EffectEntry }) {
  const { effect } = entry;
  return (
    <main className="grid gap-6 p-3 sm:p-5 md:grid-cols-[17rem_minmax(0,1fr)]">
      <EntryViewer number={entry.pager.number} type={effect.bodySystem} name={effect.name} art={<EffectTile name={effect.name} type={effect.bodySystem} />}>
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={effect.bodySystem} />
          <span className="text-xs font-bold capitalize text-ink-soft">{effect.direction}</span>
          {entry.bestGrade && <GradeBadge grade={entry.bestGrade} limitations={null} />}
        </div>
      </EntryViewer>

      <div className="min-w-0 space-y-6">
        <Section title="Compounds behind it" empty="No sourced compound reaches it yet.">
          {entry.compounds.map((c) => (
            <EffectCard key={`${c.compound.slug}:${c.source.id}`} claim={c} on="effect" />
          ))}
        </Section>

        {entry.foods.map(({ compound, ranked, unmeasured }) => (
          <Section key={compound.slug} title={`Foods richest in ${compound.name}, per 100 g`} empty={`No food in the Dex has a measured amount of ${compound.name}.`}>
            {ranked.map((f, i) => (
              <div key={f.slug} className="flex items-center gap-3 rounded-xl border-2 border-line bg-card p-2.5">
                <span className="w-6 text-right text-sm font-medium tabular-nums text-ink-soft">{i + 1}</span>
                <EntryArt imageUrl={f.imageUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <EntryLink href={hrefOf("ingredient", f.slug)}>{f.name}</EntryLink>
                    <span className="text-sm font-medium tabular-nums">{formatAmount(f.amount, f.unit)}</span>
                  </div>
                  <div className="mt-1.5">
                    <AmountBar share={f.share} color={typeColor(effect.bodySystem)} label="" />
                  </div>
                </div>
              </div>
            ))}
            {unmeasured.length > 0 && <p className="text-sm text-ink-soft">Carried by, with no measured amount: {unmeasured.map((f) => f.name).join(", ")}.</p>}
          </Section>
        ))}
        {entry.foods.length > 0 && (
          <p className="text-sm text-ink-soft">
            Ranked by amount. A goal score that weighs several compounds together needs a reference amount for each, and none is set yet; with one compound behind this effect, the order is the same either
            way.
          </p>
        )}

        <SourcesSection sources={entry.sources} />
      </div>
    </main>
  );
}
