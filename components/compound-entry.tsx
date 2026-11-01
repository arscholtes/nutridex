import { typeColor } from "../lib/art/palette.ts";
import { hrefOf, type CompoundEntry } from "../lib/db/dex.ts";
import { EffectCard, ModifierCard, PrepCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { AmountBar, EntryArt, EntryLink, EntryViewer, formatAmount, Section, SectionTitle, SourceLink, SourcesSection, TypeBadge } from "./parts.tsx";

const NOT_ON_FILE = "Not on file yet";

/** A compound's Dex entry: what it does, which foods carry it, what helps it absorb, what prep does, and how it works. */
export function CompoundEntryView({ entry }: { entry: CompoundEntry }) {
  const { compound } = entry;
  const color = typeColor(compound.class);
  return (
    <main className="grid gap-6 p-3 sm:p-5 md:grid-cols-[17rem_minmax(0,1fr)]">
      <EntryViewer number={entry.pager.number} type={compound.class} name={compound.name} art={<EntryArt compound={compound} size={240} />}>
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={compound.class} />
          {entry.bestGrade && <GradeBadge grade={entry.bestGrade} limitations={null} />}
        </div>
        <p className="text-sm text-ink-soft">
          {compound.chebiId !== null ? (
            <a className="underline decoration-line underline-offset-2" href={`https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:${compound.chebiId}`} target="_blank" rel="noreferrer">
              CHEBI:{compound.chebiId}
            </a>
          ) : (
            "No ChEBI id on file"
          )}
          {entry.classes.length > 0 && `, in ChEBI's ${entry.classes.map((k) => k.name).join(", ")} class`}
        </p>
      </EntryViewer>

      <div className="min-w-0 space-y-6">
        <Section title="What it does" empty="No sourced effect on file for it yet.">
          {entry.effects.map((e) => (
            <EffectCard key={`${e.effect.slug}:${e.source.id}`} claim={e} on="compound" />
          ))}
        </Section>

        <Section title="Cautions" empty="No caution on file. That means none has been sourced yet, not that there are none.">
          {entry.cautions.map((c) => (
            <div key={`${c.kind}:${c.summary}`} className="rounded-xl border-2 border-rose-400 bg-rose-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold capitalize text-rose-900">{c.kind}</span>
                <GradeBadge grade={c.grade} limitations={c.source.limitations} />
              </div>
              <p className="mt-1">{c.summary}</p>
              <p className="mt-2 text-xs">
                <SourceLink source={c.source} />
              </p>
            </div>
          ))}
        </Section>

        <Section title="Foods that carry it, per 100 g" empty="No food in the Dex has a measured amount of it.">
          {entry.foods.map((f) => (
            <div key={f.slug} className="flex items-center gap-3 rounded-xl border-2 border-line bg-card p-2.5">
              <EntryArt imageUrl={f.imageUrl} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <EntryLink href={hrefOf("ingredient", f.slug)}>{f.name}</EntryLink>
                  <span className="text-sm font-medium tabular-nums">
                    {formatAmount(f.amount, f.unit)}
                    {f.perServing !== null && <span className="text-ink-soft">, {formatAmount(f.perServing, f.unit)} per serving</span>}
                  </span>
                </div>
                <div className="mt-1.5">
                  <AmountBar share={f.share} color={color} label="" />
                </div>
              </div>
            </div>
          ))}
          {entry.foods.length > 0 && entry.foods.every((f) => f.perServing === null) && <p className="text-sm text-ink-soft">No typical serving sizes on file yet, so amounts are per 100 g only.</p>}
          {entry.absent.none.length > 0 && <p className="text-sm text-ink-soft">USDA measured none in: {entry.absent.none.map((f) => f.name).join(", ")}.</p>}
          {entry.absent.unmeasured.length > 0 && <p className="text-sm text-ink-soft">Carried by, with no measured amount: {entry.absent.unmeasured.map((f) => f.name).join(", ")}.</p>}
        </Section>

        <Section title="What helps or hinders absorption" empty="No absorption rule on file for it yet.">
          {entry.modifiers.map((m) => (
            <ModifierCard key={`${m.ruleId}:${m.basis}`} claim={m} />
          ))}
        </Section>

        <Section title="How prep changes it" empty="No prep effect on file for it yet.">
          {entry.prep.map((p) => (
            <PrepCard key={`${p.method}:${p.source.id}`} claim={p} showCompound={false} />
          ))}
        </Section>

        <Section title="How it works" empty="No mechanism on file yet.">
          {compound.mechanismSummary && <p>{compound.mechanismSummary}</p>}
          {compound.mechanismDetail && <p className="text-sm text-ink-soft">{compound.mechanismDetail}</p>}
        </Section>

        <section>
          <SectionTitle>Solubility and stability</SectionTitle>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-soft">Solubility</dt>
            <dd>{compound.solubility ?? NOT_ON_FILE}</dd>
            <dt className="text-ink-soft">Heat</dt>
            <dd>{compound.heatStability ?? NOT_ON_FILE}</dd>
            <dt className="text-ink-soft">Light</dt>
            <dd>{compound.lightStability ?? NOT_ON_FILE}</dd>
          </dl>
        </section>

        <SourcesSection sources={entry.sources} />
      </div>
    </main>
  );
}
