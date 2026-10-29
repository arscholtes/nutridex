import { typeColor } from "../lib/art/palette.ts";
import { hrefOf, type CompoundEntry } from "../lib/db/dex.ts";
import { EffectCard, ModifierCard, PrepCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { AmountBar, EntryArt, EntryLink, formatAmount, Section, SourceLink, SourcesSection, TypeBadge } from "./parts.tsx";

const NOT_ON_FILE = "Not on file yet";

/** A compound's Dex entry: how it works, what helps it absorb, what prep does, which foods carry it, and what it does. */
export function CompoundEntryView({ entry }: { entry: CompoundEntry }) {
  const { compound } = entry;
  const color = typeColor(compound.class);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center gap-5">
        <EntryArt compound={compound} size={128} />
        <div>
          <h1 className="text-3xl font-bold">{compound.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge type={compound.class} />
            {entry.bestGrade && <GradeBadge grade={entry.bestGrade} limitations={null} />}
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            {compound.chebiId !== null ? (
              <a className="underline decoration-neutral-700 underline-offset-2" href={`https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:${compound.chebiId}`} target="_blank" rel="noreferrer">
                CHEBI:{compound.chebiId}
              </a>
            ) : (
              "No ChEBI id on file"
            )}
            {entry.classes.length > 0 && ` · in ChEBI's ${entry.classes.map((k) => k.name).join(", ")} class`}
          </p>
        </div>
      </header>

      <Section title="How it works" empty="No mechanism on file yet.">
        {compound.mechanismSummary && <p className="text-neutral-200">{compound.mechanismSummary}</p>}
        {compound.mechanismDetail && <p className="text-sm text-neutral-400">{compound.mechanismDetail}</p>}
      </Section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Solubility and stability</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-neutral-500">Solubility</dt>
          <dd className="text-neutral-300">{compound.solubility ?? NOT_ON_FILE}</dd>
          <dt className="text-neutral-500">Heat</dt>
          <dd className="text-neutral-300">{compound.heatStability ?? NOT_ON_FILE}</dd>
          <dt className="text-neutral-500">Light</dt>
          <dd className="text-neutral-300">{compound.lightStability ?? NOT_ON_FILE}</dd>
        </dl>
      </section>

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

      <Section title="Foods that carry it, per 100 g" empty="No food in the Dex has a measured amount of it.">
        {entry.foods.map((f) => (
          <div key={f.slug} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <EntryArt imageUrl={f.imageUrl} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <EntryLink href={hrefOf("ingredient", f.slug)}>{f.name}</EntryLink>
                <span className="text-sm tabular-nums text-neutral-300">
                  {formatAmount(f.amount, f.unit)}
                  {f.perServing !== null && <span className="text-neutral-500"> · {formatAmount(f.perServing, f.unit)} per serving</span>}
                </span>
              </div>
              <div className="mt-1.5">
                <AmountBar share={f.share} color={color} label="" />
              </div>
            </div>
          </div>
        ))}
        {entry.foods.length > 0 && entry.foods.every((f) => f.perServing === null) && (
          <p className="text-sm text-neutral-500">No typical serving sizes on file yet, so amounts are per 100 g only.</p>
        )}
        {entry.absent.none.length > 0 && (
          <p className="text-sm text-neutral-500">USDA measured none in: {entry.absent.none.map((f) => f.name).join(", ")}.</p>
        )}
        {entry.absent.unmeasured.length > 0 && (
          <p className="text-sm text-neutral-500">
            Carried by, with no measured amount: {entry.absent.unmeasured.map((f) => f.name).join(", ")}.
          </p>
        )}
      </Section>

      <Section title="What it does" empty="No sourced effect on file for it yet.">
        {entry.effects.map((e) => (
          <EffectCard key={`${e.effect.slug}:${e.source.id}`} claim={e} on="compound" />
        ))}
      </Section>

      <Section title="Cautions" empty="No caution on file. That means none has been sourced yet, not that there are none.">
        {entry.cautions.map((c) => (
          <div key={`${c.kind}:${c.summary}`} className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold capitalize text-rose-200">{c.kind}</span>
              <GradeBadge grade={c.grade} limitations={c.source.limitations} />
            </div>
            <p className="mt-1 text-neutral-300">{c.summary}</p>
            <p className="mt-2 text-xs">
              <SourceLink source={c.source} />
            </p>
          </div>
        ))}
      </Section>

      <SourcesSection sources={entry.sources} />
    </main>
  );
}
