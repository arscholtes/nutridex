import { DexShell } from "../../components/dex-shell.tsx";
import { SourceLink } from "../../components/parts.tsx";
import { sourceList } from "../../lib/db/dex.ts";

/** Every citation, with what it supports and its limitations. */
export default async function SourcesPage() {
  const sources = await sourceList();
  return (
    <DexShell>
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <h1 className="text-3xl font-bold">Sources</h1>
      <p className="mt-1 text-ink-soft">Every citation in the Dex, what it supports, and where it falls short.</p>
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
            {s.supports.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {s.supports.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
    </DexShell>
  );
}
