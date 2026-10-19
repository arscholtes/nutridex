import { notFound } from "next/navigation";
import { EffectEntryView } from "../../../components/effect-entry.tsx";
import { effectEntry } from "../../../lib/db/dex.ts";

export default async function EffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await effectEntry((await params).slug);
  if (!entry) notFound();
  return <EffectEntryView entry={entry} />;
}
