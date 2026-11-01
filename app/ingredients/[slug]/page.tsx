import { notFound } from "next/navigation";
import { DexShell } from "../../../components/dex-shell.tsx";
import { IngredientEntryView } from "../../../components/ingredient-entry.tsx";
import { typeColor } from "../../../lib/art/palette.ts";
import { ingredientEntry } from "../../../lib/db/dex.ts";

export default async function IngredientPage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await ingredientEntry((await params).slug);
  if (!entry) notFound();
  return (
    <DexShell lens={typeColor(entry.ingredient.category)} pager={entry.pager}>
      <IngredientEntryView entry={entry} />
    </DexShell>
  );
}
