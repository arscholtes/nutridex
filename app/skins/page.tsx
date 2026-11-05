import type { CSSProperties, ReactNode } from "react";
import { EntryArt } from "../../components/parts.tsx";
import { GameShell } from "../../components/game.tsx";
import { typeColor } from "../../lib/art/palette.ts";
import { listEntries } from "../../lib/db/dex.ts";
import { SKINS, skinVariables, type SkinDefinition } from "../../lib/skins.ts";
import { currentSkin, viewer } from "../../lib/viewer.ts";
import { chooseSkin } from "../actions.ts";

/** A small page in a skin's own colours and type, with something you have already unlocked standing on its stage. */
function SkinPreview({ skin, art, type }: { skin: SkinDefinition; art: ReactNode; type: string }) {
  if (skin.shell === "handheld") return <span className={`dex-skin-preview dex-skin-preview-${skin.id}`} aria-hidden />;
  const look = { ...skinVariables(skin), "--type": type } as CSSProperties;
  return (
    <span className={`dex-skin-preview-page dex-backdrop-${skin.backdrop}`} style={look} aria-hidden>
      <span className={`dex-skin-preview-stage ${skin.stage === "foil" ? "dex-foil" : ""}`} data-stage={skin.stage} data-creature={skin.creature}>
        {art}
      </span>
      <span>
        <span className="dex-skin-preview-name">NutriDex</span>
        <span className="dex-skin-preview-button">Upload</span>
      </span>
    </span>
  );
}

/** Choose how the Dex looks. */
export default async function SkinsPage() {
  const { skin, syncs } = await currentSkin();
  const { revealed } = await viewer();
  const unlocked = (await listEntries({ kind: "ingredient" })).find((c) => revealed.foods.has(c.slug));
  const art = unlocked ? <EntryArt imageUrl={unlocked.imageUrl} size={84} cutout /> : null;
  return (
    <GameShell>
      <main className="mx-auto max-w-5xl px-3.5 pb-8 pt-2">
        <h1 className="text-3xl font-bold">Skins</h1>
        <p className="mt-1 text-ink-soft">
          {syncs ? "Your choice follows you to every device using your passcode." : "This stays in this browser until you upload with your passcode. After that it follows you to your other devices."}
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKINS.map((s) => (
            <li key={s.id}>
              <form action={chooseSkin.bind(null, s.id)}>
                <button type="submit" className="dex-skin-card" aria-pressed={s.id === skin}>
                  <SkinPreview skin={s} art={art} type={typeColor(unlocked?.type ?? null)} />
                  <span className="block p-3.5">
                    <span className="block text-lg font-bold">
                      {s.name}
                      {s.id === skin && <span className="ml-2 text-sm font-medium text-ink-soft">Wearing this</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{s.about}</span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </main>
    </GameShell>
  );
}
