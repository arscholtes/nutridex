import { typeColor } from "../lib/art/palette.ts";
import { hrefOf, type IngredientEntry } from "../lib/db/dex.ts";
import { AbsorptionTipCard, EffectCard, PrepCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { AmountBar, EntryArt, EntryLink, formatAmount, Section, SourcesSection, TypeBadge } from "./parts.tsx";

/** An ingredient's Dex entry: what is in it, how it absorbs, what prep does, what it does, and why we think so. */
export function IngredientEntryView({ entry }: { entry: IngredientEntry }) {
  const { ingredient } = entry;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center gap-5">
        <EntryArt imageUrl={ingredient.imageUrl} size={128} />
        <div>
          <h1 className="text-3xl font-bold">{ingredient.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge type={ingredient.category} />
            {entry.bestGrade && <GradeBadge grade={entry.bestGrade} limitations={null} />}
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            {entry.compounds.length} compounds present per 100 g, from USDA FoodData Central
          </p>
        </div>
      </header>

      <Section title="What is in it" empty="USDA measured none of the Dex's compounds in it.">
        {entry.compounds.map((c) => (
          <div key={c.slug} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <EntryLink href={hrefOf("compound", c.slug)}>{c.name}</EntryLink>
              <span className="text-sm tabular-nums text-neutral-300">{formatAmount(c.amount, c.unit)} per 100 g</span>
            </div>
            <div className="mt-2">
              <AmountBar
                share={c.share}
                color={typeColor(c.class)}
                label={c.richest.slug === ingredient.slug ? "The most of any food in the Dex" : `${Math.round(c.share * 100)}% of ${c.richest.name}, the most in the Dex`}
              />
            </div>
          </div>
        ))}
        {entry.absent.none.length > 0 && (
          <p className="text-sm text-neutral-500">USDA measured none of: {entry.absent.none.map((c) => c.name).join(", ")}.</p>
        )}
        {entry.absent.unmeasured.length > 0 && (
          <p className="text-sm text-neutral-500">
            Not measured, so missing rather than zero: {entry.absent.unmeasured.map((c) => c.name).join(", ")}.
          </p>
        )}
      </Section>

      <Section title="Absorption, for 100 g eaten on its own" empty="No absorption rule reaches what is in it yet.">
        {entry.absorption.map((tip) => (
          <AbsorptionTipCard key={`${tip.flag.compoundSlug}:${tip.flag.ruleIds.join(",")}`} tip={tip} />
        ))}
      </Section>

      <Section title="Pairs well with" empty="Nothing on file suggests a pairing yet.">
        {entry.pairsWellWith.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-200">
            {entry.pairsWellWith.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="How prep changes it" empty="No prep effect on file for what is in it.">
        {entry.prep.map((p) => (
          <PrepCard key={`${p.compound.slug}:${p.method}:${p.source.id}`} claim={p} showCompound />
        ))}
      </Section>

      <Section title="What it does" empty="No sourced effect reaches what is in it yet.">
        {entry.effects.map((e) => (
          <EffectCard key={`${e.effect.slug}:${e.compound.slug}:${e.source.id}`} claim={e} on="ingredient" />
        ))}
      </Section>

      <Section title="Cautions" empty="No caution on file. That means none has been sourced yet, not that there are none.">
        {entry.cautions.map((c) => (
          <div key={`${c.kind}:${c.summary}`} className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold capitalize text-rose-200">{c.kind}</span>
              {c.grade && <GradeBadge grade={c.grade} limitations={null} />}
            </div>
            <p className="mt-1 text-neutral-300">{c.summary}</p>
            {c.advice && <p className="mt-1 text-neutral-100">{c.advice}</p>}
          </div>
        ))}
      </Section>

      <SourcesSection sources={entry.sources} />
    </main>
  );
}
