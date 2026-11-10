import { notFound } from "next/navigation";
import { GameShell } from "../../../components/game.tsx";
import { RecipeView } from "../../../components/recipe-view.tsx";
import { recipePage } from "../../../lib/db/recipes.ts";
import { viewer } from "../../../lib/viewer.ts";

export default async function RecipePageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { revealed } = await viewer();
  const page = await recipePage(slug);
  // A recipe with a food not yet found does not exist as far as this screen can tell.
  if (!page || page.grid.rows.some((r) => !revealed.foods.has(r.ingredientSlug))) notFound();
  return (
    <GameShell>
      <RecipeView page={page} />
    </GameShell>
  );
}
