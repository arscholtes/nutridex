import { SourceLink } from "../../components/parts.tsx";
import { sourceList } from "../../lib/db/dex.ts";

/** Every citation, with what it supports and its limitations. */
export default async function SourcesPage() {
  const sources = await sourceList();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Sources</h1>
      <p className="mt-1 text-neutral-400">Every citation in the Dex, what it supports, and where it falls short.</p>
      <ul className="mt-6 space-y-4">
        {sources.map((s) => (
          <li key={s.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="font-semibold">
              <SourceLink source={s} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
              {[s.studyType, s.year, s.pmid && `PMID ${s.pmid}`, s.doi && `doi ${s.doi}`].filter(Boolean).join(" · ")}
            </p>
            {s.population && <p className="mt-2 text-sm text-neutral-300">{s.population}</p>}
            {s.limitations && (
              <p className="mt-1 text-sm text-neutral-400">
                <span className="text-neutral-500">Limitations: </span>
                {s.limitations}
              </p>
            )}
            {s.supports.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-neutral-300">
                {s.supports.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
