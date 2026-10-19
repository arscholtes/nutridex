import { notFound } from "next/navigation";
import { CompoundEntryView } from "../../../components/compound-entry.tsx";
import { compoundEntry } from "../../../lib/db/dex.ts";

export default async function CompoundPage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await compoundEntry((await params).slug);
  if (!entry) notFound();
  return <CompoundEntryView entry={entry} />;
}
