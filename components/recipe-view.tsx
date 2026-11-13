import { hrefOf } from "../lib/db/dex.ts";
import type { RecipePage } from "../lib/db/recipes.ts";
import type { GridCell } from "../lib/recipe-grid.ts";
import { AbsorptionTipCard, CautionCard } from "./claims.tsx";
import { GradeBadge } from "./grade-badge.tsx";
import { PANEL_GROUPS, PanelTable } from "./ingredient-entry.tsx";
import { EntryLink, formatAmount, Section } from "./parts.tsx";

/** A saved recipe: its spanning grid, and below it the profile drawn from the same recipe. */
export function RecipeView({ page }: { page: RecipePage }) {
  const { grid, profile } = page;
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
      </header>

      <RecipeGridTable page={page} />

      <Section title="Per serving" empty="No food in this recipe has a measured amount of any compound yet.">
        {PANEL_GROUPS.map(({ group, title }) => (
          <PanelTable key={group} title={title} rows={page.panel.filter((r) => r.group === group)} />
        ))}
        {others.length > 0 && (
          <details className="dex-panel p-3">
            <summary className="cursor-pointer text-sm font-bold">Everything else measured ({others.length})</summary>
            <ul className="mt-2 grid gap-x-6 gap-y-2 text-sm lg:grid-cols-2">
              {others.map((t) => (
                <li key={t.compoundSlug}>
                  <div className="flex items-baseline justify-between gap-2">
                    <EntryLink href={hrefOf("compound", t.compoundSlug)}>{page.compoundNames[t.compoundSlug]}</EntryLink>
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
          <AbsorptionTipCard key={`${tip.flag.compoundSlug}:${tip.flag.status}`} tip={tip} />
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
              <EntryLink href={hrefOf("effect", e.effectSlug)}>{page.effectNames[e.effectSlug]}</EntryLink>
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

/** Ingredients as rows, a column per step, each step's cell spanning the rows it uses. */
function RecipeGridTable({ page }: { page: RecipePage }) {
  const { grid } = page;
  return (
    <section className="dex-panel overflow-x-auto p-2" aria-label="Recipe grid">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th scope="col" className="text-left text-ink-soft">Ingredient</th>
            {grid.steps.map((s) => (
              <th key={s.position} scope="col" className="text-left text-ink-soft">
                Step {s.position}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, r) => (
            <tr key={row.recipeIngredientId}>
              <th scope="row" className="text-left font-normal">
                <EntryLink href={hrefOf("ingredient", row.ingredientSlug)}>{page.foodNames[row.ingredientSlug]}</EntryLink>
                <span className="block text-xs text-ink-soft">{row.grams} g · {row.prepMethod}</span>
              </th>
              {grid.steps.map((s) => {
                const cell = s.cells.find((c) => c.rowStart === r);
                if (cell) {
                  return (
                    <td key={s.position} rowSpan={cell.rowSpan} className="rounded-lg border border-line p-2 text-center align-middle">
                      <StepLabel title={page.stepTitles[s.position]} prep={s.prepMethod} cell={cell} />
                    </td>
                  );
                }
                // A row inside another row's span draws nothing; the spanning cell already covers it.
                if (s.cells.some((c) => r > c.rowStart && r < c.rowStart + c.rowSpan)) return null;
                return <td key={s.position} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {grid.steps.length === 0 && <p className="p-2 text-xs text-ink-soft">No steps: each ingredient is prepared as its row says.</p>}
    </section>
  );
}

function StepLabel({ title, prep, cell }: { title: string; prep: string | null; cell: GridCell }) {
  return (
    <>
      <span className="font-medium">{title}</span>
      {prep && <span className="block text-xs text-ink-soft">{prep}</span>}
      {cell.parts > 1 && <span className="block text-xs text-ink-soft">part {cell.part} of {cell.parts}</span>}
    </>
  );
}
