import Link from "next/link";
import type { GridCell, RecipeGrid } from "../lib/recipe-grid.ts";

/** A food as the grid names it: `href` is null where its entry is not open to this viewer, and `had` is false for a food they have never had. */
export type GridFood = { name: string; href: string | null; had: boolean };

/** The mark on a food someone has never had. */
export function NotHadMark() {
  return <span className="ml-2 inline-block rounded-full border border-line px-2 text-xs font-bold text-ink-soft">Not had yet</span>;
}

/**
 * Ingredients as rows, a column per step, each step's cell spanning the rows it uses.
 * @param lit [number | null] the step being cooked now, drawn brighter; null lights none
 */
export function RecipeGridTable({ grid, stepTitles, foods, lit = null }: { grid: RecipeGrid; stepTitles: Record<number, string>; foods: Record<string, GridFood>; lit?: number | null }) {
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
          {grid.rows.map((row, r) => {
            const food = foods[row.ingredientSlug];
            return (
              <tr key={row.recipeIngredientId}>
                <th scope="row" className="text-left font-normal">
                  {food.href ? (
                    <Link href={food.href} className="dex-link font-bold text-ink underline decoration-accent/50 decoration-2 underline-offset-4 hover:decoration-accent">{food.name}</Link>
                  ) : (
                    <span className="font-bold text-ink">{food.name}</span>
                  )}
                  {!food.had && <NotHadMark />}
                  <span className="block text-xs text-ink-soft">{row.grams} g · {row.prepMethod}</span>
                </th>
                {grid.steps.map((s) => {
                  const cell = s.cells.find((c) => c.rowStart === r);
                  if (cell) {
                    const on = lit === s.position;
                    return (
                      <td key={s.position} rowSpan={cell.rowSpan} aria-current={on ? "step" : undefined} className={`cook-cell rounded-lg border p-2 text-center align-middle ${on ? "border-accent bg-accent/15" : "border-line"} ${lit !== null && !on ? "opacity-50" : ""}`}>
                        <StepLabel title={stepTitles[s.position]} prep={s.prepMethod} cell={cell} />
                      </td>
                    );
                  }
                  // A row inside another row's span draws nothing; the spanning cell already covers it.
                  if (s.cells.some((c) => r > c.rowStart && r < c.rowStart + c.rowSpan)) return null;
                  return <td key={s.position} />;
                })}
              </tr>
            );
          })}
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
