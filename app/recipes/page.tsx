import Link from "next/link";
import { GameShell } from "../../components/game.tsx";
import { listRecipes } from "../../lib/db/recipes.ts";
import { viewer } from "../../lib/viewer.ts";

export default async function RecipesPage() {
  const { revealed } = await viewer();
  // A recipe holding a food not yet found is as hidden as that food.
  const recipes = await listRecipes(revealed.foods);
  return (
    <GameShell>
      <main className="space-y-4 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink">Recipes</h1>
          <Link href="/recipes/new" className="rounded-md border border-line px-3 py-1 text-sm font-bold">Build a recipe</Link>
        </div>
        {recipes.length === 0 ? (
          <p className="dex-panel p-3 text-sm text-ink-soft">No recipes yet that use only foods you have found. Build one from what you have.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {recipes.map((r) => (
              <li key={r.slug}>
                <Link href={`/recipes/${r.slug}`} className="dex-panel block p-3">
                  <span className="font-bold">{r.name}</span>
                  <span className="block text-sm text-ink-soft">{r.ingredients} ingredients · {r.servings === 1 ? "1 serving" : `${r.servings} servings`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </GameShell>
  );
}
