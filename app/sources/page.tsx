import { GameShell } from "../../components/game.tsx";
import { SourceLink } from "../../components/parts.tsx";
import { compoundEntry, effectEntry, ingredientEntry, sourceList } from "../../lib/db/dex.ts";
import { viewer } from "../../lib/viewer.ts";

/** The citations behind what you have unlocked, with their limitations. */
export default async function SourcesPage() {
  const { revealed } = await viewer();
  const behind = new Set<string>();
  for (const slug of revealed.foods) for (const s of (await ingredientEntry(slug))?.sources ?? []) behind.add(s.id);
  for (const slug of revealed.compounds) for (const s of (await compoundEntry(slug))?.sources ?? []) behind.add(s.id);
  for (const slug of revealed.effects) for (const s of (await effectEntry(slug))?.sources ?? []) behind.add(s.id);
  const sources = (await sourceList()).filter((s) => behind.has(s.id));
  return (
    <GameShell>
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <h1 className="text-3xl font-bold">Sources</h1>
      <p className="mt-1 text-ink-soft">The citations behind what you have unlocked, and where they fall short.</p>
      <ul className="mt-6 space-y-4">
        {sources.map((s) => (
          <li key={s.id} className="rounded-xl border-2 border-line bg-card p-3">
            <p className="font-bold">
              <SourceLink source={s} />
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {[s.studyType, s.year, s.pmid && `PMID ${s.pmid}`, s.doi && `doi ${s.doi}`].filter(Boolean).join(", ")}
            </p>
            {s.population && <p className="mt-2 text-sm">{s.population}</p>}
            {s.limitations && (
              <p className="mt-1 text-sm text-ink-soft">
                <span className="font-bold">Limitations: </span>
                {s.limitations}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
    </GameShell>
  );
}
