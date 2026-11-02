import { notFound } from "next/navigation";
import { GameShell } from "../../../components/game.tsx";
import { EffectEntryView } from "../../../components/effect-entry.tsx";
import { typeColor } from "../../../lib/art/palette.ts";
import { effectEntry, listEntries } from "../../../lib/db/dex.ts";
import { isRevealed, scrubEffect } from "../../../lib/db/reveal.ts";
import { viewer } from "../../../lib/viewer.ts";

export default async function EffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { revealed } = await viewer();
  // Something not yet encountered does not exist as far as this screen can tell.
  if (!isRevealed("effect", slug, revealed)) notFound();
  const found = await effectEntry(slug);
  if (!found) notFound();
  const entry = scrubEffect(found, revealed, await listEntries({ kind: "effect" }));
  return (
    <GameShell lens={typeColor(entry.effect.bodySystem)} pager={entry.pager}>
      <EffectEntryView entry={entry} />
    </GameShell>
  );
}
