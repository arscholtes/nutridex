import { notFound } from "next/navigation";
import { typeColor } from "../../../lib/art/palette.ts";
import { GameShell } from "../../../components/game.tsx";
import { IngredientEntryView } from "../../../components/ingredient-entry.tsx";
import { ingredientEntry, listEntries } from "../../../lib/db/dex.ts";
import { isRevealed, scrubIngredient } from "../../../lib/db/reveal.ts";
import { viewer } from "../../../lib/viewer.ts";

export default async function IngredientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { revealed } = await viewer();
  // Something not yet encountered does not exist as far as this screen can tell.
  if (!isRevealed("ingredient", slug, revealed)) notFound();
  const found = await ingredientEntry(slug);
  if (!found) notFound();
  const entry = scrubIngredient(found, revealed, await listEntries({ kind: "ingredient" }));
  return (
    <GameShell lens={typeColor(entry.ingredient.category)} pager={entry.pager}>
      <IngredientEntryView entry={entry} />
    </GameShell>
  );
}
