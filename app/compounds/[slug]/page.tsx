import { notFound } from "next/navigation";
import { DexShell } from "../../../components/dex-shell.tsx";
import { CompoundEntryView } from "../../../components/compound-entry.tsx";
import { typeColor } from "../../../lib/art/palette.ts";
import { compoundEntry } from "../../../lib/db/dex.ts";

export default async function CompoundPage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await compoundEntry((await params).slug);
  if (!entry) notFound();
  return (
    <DexShell lens={typeColor(entry.compound.class)} pager={entry.pager}>
      <CompoundEntryView entry={entry} />
    </DexShell>
  );
}
