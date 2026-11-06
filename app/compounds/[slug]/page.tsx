import { notFound } from "next/navigation";
import { typeColor } from "../../../lib/art/palette.ts";
import { GameShell } from "../../../components/game.tsx";
import { CompoundEntryView } from "../../../components/compound-entry.tsx";
import { compoundEntry, dexSteps } from "../../../lib/db/dex.ts";
import { isRevealed, scrubCompound } from "../../../lib/db/reveal.ts";
import { viewer } from "../../../lib/viewer.ts";

export default async function CompoundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { revealed } = await viewer();
  // Something not yet encountered does not exist as far as this screen can tell.
  if (!isRevealed("compound", slug, revealed)) notFound();
  const found = await compoundEntry(slug);
  if (!found) notFound();
  const entry = scrubCompound(found, revealed, await dexSteps("compound"));
  return (
    <GameShell lens={typeColor(entry.compound.class)} pager={entry.pager}>
      <CompoundEntryView entry={entry} />
    </GameShell>
  );
}
