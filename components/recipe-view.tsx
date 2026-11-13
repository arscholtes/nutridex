import { hrefOf } from "../lib/db/dex.ts";
import type { RecipePage } from "../lib/db/recipes.ts";
import Link from "next/link";
import type { Revealed } from "../lib/db/encounters.ts";
import { AbsorptionTipCard, CautionCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { PANEL_GROUPS, PanelTable } from "./ingredient-entry.tsx";
import { EntryLink, formatAmount, Section } from "./parts.tsx";
import { RecipeGridTable, type GridFood } from "./recipe-grid-table.tsx";

/**
 * How a recipe's grid names each of its foods for one viewer.
 * @param revealed [Revealed] what this viewer has opened
 * @return [Record<string, GridFood>] by food slug; a food never had has no link, since its entry is still closed
 */
export function gridFoods(page: RecipePage, revealed: Revealed): Record<string, GridFood> {
  return Object.fromEntries(
    Object.entries(page.foodNames).map(([slug, name]) => {
      const had = revealed.foods.has(slug);
      return [slug, { name, had, href: had ? hrefOf("ingredient", slug) : null }];
    }),
  );
}

/**
 * A recipe: its spanning grid, and below it the profile drawn from the same recipe. It shows whatever is in it;
 * a food never had is marked, and a name links only where that entry is open to this viewer.
 * @param cookable [boolean] whether to offer cooking along, which a recipe still being built cannot
 */
export function RecipeView({ page, revealed, cookable = false }: { page: RecipePage; revealed: Revealed; cookable?: boolean }) {
  const { grid, profile } = page;
  const foods = gridFoods(page, revealed);
  const panel = page.panel.map((r) => ({ ...r, locked: !revealed.compounds.has(r.slug) }));
  const notHad = Object.values(foods).filter((f) => !f.had).length;
  const compound = (slug: string) => (revealed.compounds.has(slug) ? <EntryLink href={hrefOf("compound", slug)}>{page.compoundNames[slug]}</EntryLink> : <span className="font-bold text-ink">{page.compoundNames[slug]}</span>);
  const effect = (slug: string) => (revealed.effects.has(slug) ? <EntryLink href={hrefOf("effect", slug)}>{page.effectNames[slug]}</EntryLink> : <span className="font-bold text-ink">{page.effectNames[slug]}</span>);
  const inPanel = new Set(page.panel.map((r) => r.slug));
  const byName = (a: { compoundSlug: string }, b: { compoundSlug: string }) => page.compoundNames[a.compoundSlug].localeCompare(page.compoundNames[b.compoundSlug]);
  const rest = profile.perServing.filter((t) => !inPanel.has(t.compoundSlug)).sort(byName);
  const others = rest.filter((t) => t.amount !== null && t.amount > 0);
  const none = rest.filter((t) => t.amount === 0);
  const unmeasured = rest.filter((t) => t.amount === null);
  return (
    <article className="dex-entry min-w-0 space-y-6 p-3 sm:p-5">
      <header>
        <h1 className="text-2xl font-bold text-ink">{page.name}</h1>
        <p className="text-sm text-ink-soft">
          {page.servings === 1 ? "1 serving" : `${page.servings} servings`} · {grid.rows.length === 1 ? "1 ingredient" : `${grid.rows.length} ingredients`} · {grid.steps.length === 1 ? "1 step" : `${grid.steps.length} steps`}
        </p>
        {notHad > 0 && (
          <p className="mt-2 text-sm text-ink-soft">
            {notHad === 1 ? "One food here is one you have never had." : `${notHad} foods here are ones you have never had.`} Its entry opens once you have.
          </p>
        )}
        {cookable && (
          <Link href={`/recipes/${page.slug}/cook`} className="dex-button mt-3 inline-block">
            Cook along
          </Link>
        )}
      </header>

      <RecipeGridTable grid={grid} stepTitles={page.stepTitles} foods={foods} />

      <Section title="Per serving" empty="No food in this recipe has a measured amount of any compound yet.">
        {PANEL_GROUPS.map(({ group, title }) => (
          <PanelTable key={group} title={title} rows={panel.filter((r) => r.group === group)} />
        ))}
        {others.length > 0 && (
          <details className="dex-panel p-3">
            <summary className="cursor-pointer text-sm font-bold">Everything else measured ({others.length})</summary>
            <ul className="mt-2 grid gap-x-6 gap-y-2 text-sm lg:grid-cols-2">
              {others.map((t) => (
                <li key={t.compoundSlug}>
                  <div className="flex items-baseline justify-between gap-2">
                    {compound(t.compoundSlug)}
                    <span className="font-medium tabular-nums">{formatAmount(t.amount!, t.unit!)}</span>
                  </div>
                  {t.missingFrom.length > 0 && (
                    <p className="text-xs text-ink-soft">Leaves out {t.missingFrom.map((s) => page.foodNames[s]).join(", ")}: not measured there.</p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
        {none.length > 0 && <p className="text-sm text-ink-soft">USDA measured none of these in any of its foods: {none.map((t) => page.compoundNames[t.compoundSlug]).join(", ")}.</p>}
        {unmeasured.length > 0 && <p className="text-sm text-ink-soft">Not measured in any of its foods, so missing rather than zero: {unmeasured.map((t) => page.compoundNames[t.compoundSlug]).join(", ")}.</p>}
        <p className="text-sm text-ink-soft">Per serving, from USDA FoodData Central, after each prep step. Where no food in it has a value it says missing, never zero.</p>
      </Section>

      <Section title="Absorption" empty="Nothing in this recipe changes how its compounds absorb, as far as anything on file says.">
        {page.absorption.map((tip) => (
          <AbsorptionTipCard key={`${tip.flag.compoundSlug}:${tip.flag.status}`} tip={tip} linked={revealed.compounds.has(tip.compound.slug)} />
        ))}
      </Section>

      <Section title="What the steps do" empty="No preparation here changes a compound by a sourced amount.">
        {profile.prep.map((p) => (
          <p key={`${p.ingredientSlug}:${p.compoundSlug}:${p.method}`} className="dex-panel p-3 text-sm">
            <span className="font-medium">{page.foodNames[p.ingredientSlug]}</span>, {p.method}: {page.compoundNames[p.compoundSlug]}{" "}
            {p.retentionFactor === null ? "changes by an amount no source gives" : `keeps ${Math.round(p.retentionFactor * 100)}%`}
            {p.note && <span className="block text-ink-soft">{p.note}</span>}
          </p>
        ))}
      </Section>

      <Section title="Cautions" empty="No caution on file. That means none has been sourced yet, not that there are none.">
        {profile.cautions.map((c) => (
          <CautionCard key={`${c.kind}:${c.summary}`} caution={c} />
        ))}
      </Section>

      <Section title="What it does" empty="No sourced effect reaches what is in it yet.">
        {profile.effects.map((e) => {
          const goal = profile.goalScores[e.effectSlug];
          return (
            <div key={e.effectSlug} className="dex-panel flex flex-wrap items-center gap-2 p-3 text-sm">
              {effect(e.effectSlug)}
              <GradeBadge grade={e.bestGrade} limitations={null} />
              <span className="text-ink-soft capitalize">{e.direction}</span>
              {e.onset && <span className="text-ink-soft">onset {e.onset}</span>}
              {goal && goal.score > 0 && <span className="ml-auto tabular-nums" title="Each compound's amount against its reference, weighted by its evidence. Compare recipes with it; it is not a percentage.">score {goal.score.toFixed(1)}</span>}
            </div>
          );
        })}
      </Section>
    </article>
  );
}
