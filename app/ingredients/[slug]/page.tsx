import { notFound } from "next/navigation";
import { IngredientEntryView } from "../../../components/ingredient-entry.tsx";
import { ingredientEntry } from "../../../lib/db/dex.ts";

export default async function IngredientPage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await ingredientEntry((await params).slug);
  if (!entry) notFound();
  return <IngredientEntryView entry={entry} />;
}
