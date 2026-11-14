import { notFound } from "next/navigation";
import { GameShell } from "../../../components/game.tsx";
import { RecipeView } from "../../../components/recipe-view.tsx";
import { recipePage } from "../../../lib/db/recipes.ts";
import { viewer } from "../../../lib/viewer.ts";

export default async function RecipePageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { revealed, account } = await viewer();
  const page = await recipePage(slug, { owner: account?.owner ?? null, foods: revealed.foods });
  if (!page) notFound();
  return (
    <GameShell>
      <RecipeView page={page} />
    </GameShell>
  );
}
