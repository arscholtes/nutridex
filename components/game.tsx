// The collection game on the web: the upload banner, the "what did you have" box and progress.
import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { markEncountered } from "../app/actions.ts";
import { creatureDataUrl, creatureSilhouette } from "../lib/art/creature.ts";
import { listEntries, type DexPager } from "../lib/db/dex.ts";
import { revealedEntries } from "../lib/db/encounters.ts";
import { currentSkin, viewer } from "../lib/viewer.ts";
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
        <AmountBar share={total === 0 ? 0 : unlocked / total} className="dex-holo-line" label="" />
      </div>
    </div>
  );
}

/** The way into the game, under your thumb at the bottom of the screen: you say what you had, and only foods matching it appear. */
export async function HadComposer({ had }: { had?: string }) {
  const { revealed } = await viewer();
  const words = had?.trim() ?? "";
  const candidates = words.length >= 3 ? (await listEntries({ q: words, kind: "ingredient" })).filter((c) => !revealed.foods.has(c.slug)) : [];
  return (
    <section className="dex-dock">
      {words.length >= 3 && (
        <div className="dex-glass mb-2 max-h-64 overflow-y-auto rounded-3xl p-3">
          {candidates.length === 0 && <p className="text-sm text-ink-soft">Nothing new matches that yet.</p>}
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.slug} className="flex items-center justify-between gap-3">
                <span className="font-bold">{c.name}</span>
                <form action={markEncountered.bind(null, c.slug)}>
                  <button type="submit" className="dex-button" aria-label={`I've had ${c.name}`}>
                    I've had this
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form action="/" className="dex-glass flex items-center gap-2 rounded-full py-1 pl-4 pr-1">
        <input name="had" aria-label="What did you have?" defaultValue={words} placeholder="What did you have?" className="min-h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-soft" />
        <button type="submit" className="dex-button">
          Look
        </button>
      </form>
    </section>
  );
}

/** What a game screen sits in: the frame, the upload banner, and the unlock animation when one is due. */
export async function GameShell({ lens, pager, children }: { lens?: string; pager?: DexPager; children: ReactNode }) {
  const { skin } = await currentSkin();
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
      art: creatureDataUrl(creatureSilhouette(readFileSync(`public${card.imageUrl}`, "utf8"))),
      compounds: reveal.compounds.size,
      effects: reveal.effects.size,
    });
  }
  return (
    <DexShell skin={skin} lens={lens} pager={pager}>
      {pending.length > 0 && <UploadBanner count={pending.length} needsPasscode={!canUpload} />}
      {children}
      {queue.length > 0 && <UnlockModal queue={queue} />}
    </DexShell>
  );
}
