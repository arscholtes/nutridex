import { notFound } from "next/navigation";
import { DexShell } from "../../../components/dex-shell.tsx";
import { EffectEntryView } from "../../../components/effect-entry.tsx";
import { typeColor } from "../../../lib/art/palette.ts";
import { effectEntry } from "../../../lib/db/dex.ts";

export default async function EffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await effectEntry((await params).slug);
  if (!entry) notFound();
  return (
    <DexShell lens={typeColor(entry.effect.bodySystem)} pager={entry.pager}>
      <EffectEntryView entry={entry} />
    </DexShell>
  );
}
