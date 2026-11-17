import Link from "next/link";
import { GameShell } from "../../components/game.tsx";
import { listRecipes } from "../../lib/db/recipes.ts";
import { viewer } from "../../lib/viewer.ts";

export default async function RecipesPage() {
  const { revealed, account } = await viewer();
  const recipes = await listRecipes(revealed.foods, account?.owner ?? null);
  return (
    <GameShell>
      <main className="space-y-4 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink">Recipes</h1>
          <Link href="/recipes/new" className="rounded-md border border-line px-3 py-1 text-sm font-bold">Build a recipe</Link>
        </div>
        {recipes.length === 0 ? (
          <p className="dex-panel p-3 text-sm text-ink-soft">No recipes yet. Build one from the foods you have had.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {recipes.map((r) => (
              <li key={r.slug}>
                <Link href={`/recipes/${r.slug}`} className="dex-panel block p-3">
                  <span className="font-bold">{r.name}</span>
                  <span className="block text-sm text-ink-soft">{r.ingredients === 1 ? "1 ingredient" : `${r.ingredients} ingredients`} · {r.servings === 1 ? "1 serving" : `${r.servings} servings`}</span>
                  {r.notHad > 0 && <span className="mt-1 block text-sm font-bold text-ink-soft">{r.notHad === 1 ? "1 food you have never had" : `${r.notHad} foods you have never had`}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </GameShell>
  );
}
