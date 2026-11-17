import Link from "next/link";
import { notFound } from "next/navigation";
import { GameShell } from "../../../components/game.tsx";
import { RecipeView } from "../../../components/recipe-view.tsx";
import { ownedRecipes, recipePage } from "../../../lib/db/recipes.ts";
import { encodeDraft } from "../../../lib/recipe-draft.ts";
import { viewer } from "../../../lib/viewer.ts";
import { deleteRecipeAction } from "../../actions.ts";

export default async function RecipePageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { revealed, account } = await viewer();
  const page = await recipePage(slug, { owner: account?.owner ?? null, foods: revealed.foods });
  if (!page) notFound();
  // A page with an owner loaded, so it is this person's own.
  const mine = page.owner === null ? undefined : (await ownedRecipes(page.owner)).find((r) => r.slug === slug);
  return (
    <GameShell>
      <RecipeView page={page} revealed={revealed} cookable />
      {mine && (
        <section className="space-y-3 p-3 sm:p-5" aria-label="Your recipe">
          <p className="text-sm">
            A saved recipe does not change. To alter this one,{" "}
            <Link href={`/recipes/new?d=${encodeDraft({ name: mine.name, servings: mine.servings, ingredients: mine.ingredients, steps: mine.steps })}`} className="font-bold underline underline-offset-4">
              open a copy in the builder
            </Link>{" "}
            and save it as a new one.
          </p>
          <details>
            <summary className="cursor-pointer text-sm font-bold text-danger">Delete this recipe</summary>
            <p className="mt-2 max-w-prose text-sm">This removes {page.name} for good. It cannot be undone.</p>
            <form action={deleteRecipeAction.bind(null, slug)} className="mt-2">
              <button type="submit" className="dex-button">
                Delete {page.name}
              </button>
            </form>
          </details>
        </section>
      )}
    </GameShell>
  );
}
