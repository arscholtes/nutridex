import { DexShell } from "../../components/dex-shell.tsx";
import { SourceLink } from "../../components/parts.tsx";
import { sourceList } from "../../lib/db/dex.ts";

// Past this, a source's list folds away so the other sources stay in view.
const LONG_LIST = 8;

function Supports({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc pl-5 text-sm">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

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
            {s.supports.length > 0 && s.supports.length <= LONG_LIST && <Supports items={s.supports} />}
            {s.supports.length > LONG_LIST && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-bold">Supports {s.supports.length} facts in the Dex</summary>
                <Supports items={s.supports} />
              </details>
            )}
          </li>
        ))}
      </ul>
    </main>
    </DexShell>
  );
}
