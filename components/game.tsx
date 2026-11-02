// The collection game on the web: the shell's upload banner, the "what did you have" box and progress.
import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { markEncountered } from "../app/actions.ts";
import { creatureSilhouette } from "../lib/art/creature.ts";
import { typeColor } from "../lib/art/palette.ts";
import { listEntries, type DexPager } from "../lib/db/dex.ts";
import { revealedEntries } from "../lib/db/encounters.ts";
import { viewer } from "../lib/viewer.ts";
import { DexShell } from "./dex-shell.tsx";
import { AmountBar } from "./parts.tsx";
import { UnlockModal, type UnlockCard, UploadBanner } from "./unlock.tsx";

/** How much of the collection is unlocked. It counts what is hidden without naming any of it. */
export function Progress({ unlocked, total }: { unlocked: number; total: number }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-bold">
        Unlocked <span className="tabular-nums">{unlocked}</span> of <span className="tabular-nums">{total}</span>
      </p>
      <div className="mt-1">
        <AmountBar share={total === 0 ? 0 : unlocked / total} color="var(--color-shell)" label="" />
      </div>
    </div>
  );
}

/** The way into the game: you say what you had, and only foods matching it appear. */
export async function HadComposer({ had }: { had?: string }) {
  const { revealed } = await viewer();
  const words = had?.trim() ?? "";
  const candidates = words.length >= 3 ? (await listEntries({ q: words, kind: "ingredient" })).filter((c) => !revealed.foods.has(c.slug)) : [];
  return (
    <section className="mt-3 rounded-xl border-2 border-ink bg-card p-3">
      <form action="/" className="flex flex-wrap gap-2">
        <input name="had" aria-label="What did you have?" defaultValue={words} placeholder="What did you have?" className="min-w-0 flex-1 basis-48 rounded-lg border-2 border-ink bg-white px-3 py-2 placeholder:text-ink-soft" />
        <button type="submit" className="rounded-lg border-2 border-ink bg-card px-4 py-2 text-sm font-bold hover:bg-white">
          Look
        </button>
      </form>
      {words.length >= 3 && candidates.length === 0 && <p className="mt-2 text-sm text-ink-soft">Nothing new matches that yet.</p>}
      {candidates.length > 0 && (
        <ul className="mt-2 space-y-2">
          {candidates.map((c) => (
            <li key={c.slug} className="flex items-center justify-between gap-3">
              <span className="font-bold">{c.name}</span>
              <form action={markEncountered.bind(null, c.slug)}>
                <button type="submit" className="rounded-lg border-2 border-ink bg-shell px-3 py-1.5 text-sm font-bold text-white hover:bg-shell-body">
                  I've had this
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The shell for a game screen: the device, the upload banner, and the unlock animation when one is due. */
export async function GameShell({ lens, pager, children }: { lens?: string; pager?: DexPager; children: ReactNode }) {
  const { pending, canUpload, unlocking } = await viewer();
  const foods = unlocking.length > 0 ? await listEntries({ kind: "ingredient" }) : [];
  const queue: UnlockCard[] = [];
  for (const slug of unlocking) {
    const card = foods.find((c) => c.slug === slug);
    if (!card?.imageUrl) continue;
    const reveal = await revealedEntries([slug]);
    queue.push({
      slug,
      name: card.name,
      number: card.number,
      art: card.imageUrl,
      shape: `data:image/svg+xml;utf8,${encodeURIComponent(creatureSilhouette(readFileSync(`public${card.imageUrl}`, "utf8")))}`,
      color: typeColor(card.type),
      compounds: reveal.compounds.size,
      effects: reveal.effects.size,
    });
  }
  return (
    <DexShell lens={lens} pager={pager}>
      {pending.length > 0 && <UploadBanner count={pending.length} needsPasscode={!canUpload} />}
      {children}
      {queue.length > 0 && <UnlockModal queue={queue} />}
    </DexShell>
  );
}
