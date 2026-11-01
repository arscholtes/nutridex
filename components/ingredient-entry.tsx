import { typeColor } from "../lib/art/palette.ts";
import { hrefOf, type IngredientEntry, type PanelRow } from "../lib/db/dex.ts";
import type { PanelGroup } from "../lib/usda/nutrients.ts";
import { AbsorptionTipCard, EffectCard, PrepCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { AmountBar, EntryArt, EntryLink, EntryViewer, formatAmount, Section, SourcesSection, TypeBadge } from "./parts.tsx";

/** A food's Dex entry: what it does, what is in it, how it absorbs, what prep does, and why we think so. */
export function IngredientEntryView({ entry }: { entry: IngredientEntry }) {
  const { ingredient } = entry;
  return (
    <main className="grid gap-6 p-3 sm:p-5 md:grid-cols-[17rem_minmax(0,1fr)]">
      <EntryViewer number={entry.pager.number} type={ingredient.category} name={ingredient.name} art={<EntryArt imageUrl={ingredient.imageUrl} size={240} />}>
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={ingredient.category} />
          {entry.bestGrade && <GradeBadge grade={entry.bestGrade} limitations={null} />}
        </div>
        <p className="text-sm text-ink-soft">{entry.measured} compounds measured per 100 g, from USDA FoodData Central</p>
      </EntryViewer>

      <div className="min-w-0 space-y-6">
        <Section title="What it does" empty="No sourced effect reaches what is in it yet.">
          {entry.effects.map((e) => (
            <EffectCard key={`${e.effect.slug}:${e.compound.slug}:${e.source.id}`} claim={e} on="ingredient" />
          ))}
        </Section>

        <Section title="Cautions" empty="No caution on file. That means none has been sourced yet, not that there are none.">
          {entry.cautions.map((c) => (
            <div key={`${c.kind}:${c.summary}`} className="rounded-xl border-2 border-rose-400 bg-rose-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold capitalize text-rose-900">{c.kind}</span>
                {c.grade && <GradeBadge grade={c.grade} limitations={null} />}
              </div>
              <p className="mt-1">{c.summary}</p>
              {c.advice && <p className="mt-1 font-medium">{c.advice}</p>}
            </div>
          ))}
        </Section>

        <Section title="What is in it" empty="USDA measured none of the Dex's compounds in it.">
          {entry.compounds.map((c) => (
            <div key={c.slug} className="rounded-xl border-2 border-line bg-card p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <EntryLink href={hrefOf("compound", c.slug)}>{c.name}</EntryLink>
                <span className="text-sm font-medium tabular-nums">{formatAmount(c.amount, c.unit)} per 100 g</span>
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
          {entry.absent.none.length > 0 && <p className="text-sm text-ink-soft">USDA measured none of: {entry.absent.none.map((c) => c.name).join(", ")}.</p>}
          {entry.absent.unmeasured.length > 0 && (
            <p className="text-sm text-ink-soft">Not measured, so missing rather than zero: {entry.absent.unmeasured.map((c) => c.name).join(", ")}.</p>
          )}
        </Section>

        <Section title="Nutrition per 100 g" empty="No panel nutrients are in the Dex yet.">
          {PANEL_GROUPS.map(({ group, title }) => (
            <PanelTable key={group} title={title} rows={entry.panel.filter((r) => r.group === group)} />
          ))}
          {entry.panel.length > 0 && (
            <p className="text-sm text-ink-soft">
              From USDA FoodData Central. Each bar compares this food with the richest in the Dex. Where USDA has no value for this food it says missing, never zero.
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
            <ul className="list-disc space-y-1 pl-5 text-sm">
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

        <SourcesSection sources={entry.sources} />
      </div>
    </main>
  );
}

const PANEL_GROUPS: { group: PanelGroup; title: string }[] = [
  { group: "macro", title: "Energy and macronutrients" },
  { group: "vitamin", title: "Vitamins and choline" },
  { group: "mineral", title: "Minerals" },
];

const GROUP_COLOR: Record<PanelGroup, string> = {
  macro: typeColor("macronutrient"),
  vitamin: typeColor("vitamin"),
  mineral: typeColor("mineral"),
};

/** One group of the nutrient panel: each nutrient's amount per 100 g and stat bar, or missing. */
function PanelTable({ title, rows }: { title: string; rows: PanelRow[] }) {
  return (
    <div className="rounded-xl border-2 border-line bg-card p-3">
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-2 grid gap-x-6 gap-y-2.5 lg:grid-cols-2">
        {rows.map((r) => (
          <li key={r.slug}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <EntryLink href={hrefOf("compound", r.slug)}>{r.name}</EntryLink>
              {r.amount === null ? <span className="text-ink-soft">missing</span> : <span className="font-medium tabular-nums">{formatAmount(r.amount, r.unit!)}</span>}
            </div>
            {r.share !== null && (
              <div className="mt-1">
                <AmountBar share={r.share} color={GROUP_COLOR[r.group]} label="" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
