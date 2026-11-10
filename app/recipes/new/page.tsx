import { PREP_METHODS } from "epistasis";
import { GameShell } from "../../../components/game.tsx";
import { RecipeBuilder } from "../../../components/recipe-builder.tsx";
import { RecipeView } from "../../../components/recipe-view.tsx";
import { draftPage, namedFoods } from "../../../lib/db/recipes.ts";
import { parseDraft } from "../../../lib/recipe-draft.ts";
import { viewer } from "../../../lib/viewer.ts";

export default async function NewRecipePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const { revealed, canUpload } = await viewer();
  const parsed = parseDraft(d);
  const draft = "draft" in parsed ? parsed.draft : { name: "", servings: 1, ingredients: [], steps: [] };
  const preview = draft.ingredients.length > 0 ? await draftPage(draft, revealed.foods) : null;
  return (
    <GameShell>
      <main className="space-y-6 p-3 sm:p-5">
        <h1 className="text-2xl font-bold text-ink">Build a recipe</h1>
        {"error" in parsed && <p className="text-sm text-danger" role="alert">{parsed.error}</p>}
        <RecipeBuilder foods={await namedFoods(revealed.foods)} prepMethods={[...PREP_METHODS]} initial={draft} canSave={canUpload} />
        {preview && "problems" in preview && (
          <ul className="dex-panel list-disc space-y-1 p-3 pl-8 text-sm text-ink-soft" aria-label="Why there is no preview yet">
            {preview.problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        {preview && !("problems" in preview) && <RecipeView page={preview} />}
      </main>
    </GameShell>
  );
}
