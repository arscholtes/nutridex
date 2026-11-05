import { GameShell } from "../../components/game.tsx";
import { SourceLink } from "../../components/parts.tsx";
import { sql } from "../../lib/db/client.ts";
import { sourceList } from "../../lib/db/dex.ts";
import { sourcesBehind } from "../../lib/db/encounters.ts";
import { viewer } from "../../lib/viewer.ts";

/** The citations behind what you have unlocked, with their limitations. */
export default async function SourcesPage() {
  const { revealed } = await viewer();
  const sources = await sourceList(sql, await sourcesBehind(revealed));
  return (
    <GameShell>
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <h1 className="text-3xl font-bold">Sources</h1>
      <p className="mt-1 text-ink-soft">The citations behind what you have unlocked, and where they fall short.</p>
      <ul className="mt-6 space-y-4">
        {sources.map((s) => (
          <li key={s.id} className="dex-panel p-3">
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
