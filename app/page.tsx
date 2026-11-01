import Link from "next/link";
import { DexShell } from "../components/dex-shell.tsx";
import { EntryCardView } from "../components/entry-card.tsx";
import { dexCounts, entryTypes, listEntries, type EntryKind } from "../lib/db/dex.ts";

const KINDS: { value: EntryKind; label: string }[] = [
  { value: "ingredient", label: "Foods" },
  { value: "compound", label: "Compounds" },
  { value: "effect", label: "Effects" },
];

type Search = { q?: string; kind?: string; type?: string };

/** @return [string] the home link for a kind tab, keeping the words searched */
function tabHref(q: string | undefined, kind?: EntryKind): string {
  const query = new URLSearchParams({ ...(q ? { q } : {}), ...(kind ? { kind } : {}) }).toString();
  return query ? `/?${query}` : "/";
}

/** The Dex home: search across foods, compounds and effects, filter by kind and type, and browse the cards. */
export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const kind = KINDS.find((k) => k.value === params.kind)?.value;
  const [types, counts] = await Promise.all([entryTypes(), dexCounts()]);
  const type = params.type && Object.values(types).some((list) => list.includes(params.type!)) ? params.type : undefined;
  const cards = await listEntries({ q: params.q, kind, type });
  const tabs = [
    { label: "All", value: undefined, count: counts.ingredient + counts.compound + counts.effect },
    ...KINDS.map((k) => ({ label: k.label, value: k.value, count: counts[k.value] })),
  ];

  return (
    <DexShell>
      <main className="p-3 sm:p-5">
        <h1 className="text-lg font-bold">What is in your food, what it does, and what helps it work.</h1>

        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Kinds of entry">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={tabHref(params.q, t.value)}
              aria-current={t.value === kind ? "page" : undefined}
              className={`rounded-lg border-2 border-ink px-2.5 py-1 text-sm font-bold ${t.value === kind ? "bg-ink text-screen" : "bg-card text-ink hover:bg-white"}`}
            >
              {t.label} <span className="font-medium tabular-nums">{t.count}</span>
            </Link>
          ))}
        </nav>

        <form className="mt-3 flex flex-wrap gap-2" action="/">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <input
            name="q"
            aria-label="Search the Dex"
            defaultValue={params.q ?? ""}
            placeholder="Search foods, compounds, effects"
            className="min-w-0 flex-1 basis-56 rounded-lg border-2 border-ink bg-card px-3 py-2 placeholder:text-ink-soft"
          />
          <select name="type" aria-label="Type" defaultValue={type ?? ""} className="rounded-lg border-2 border-ink bg-card px-2 py-2 text-sm font-bold">
            <option value="">Any type</option>
            {KINDS.filter((k) => !kind || k.value === kind).map((k) => (
              <optgroup key={k.value} label={k.label}>
                {types[k.value].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="submit" className="rounded-lg border-2 border-ink bg-shell px-4 py-2 text-sm font-bold text-white hover:bg-shell-body">
            Search
          </button>
        </form>

        {cards.length === 0 ? (
          <p className="mt-8 pb-6">
            Nothing in the Dex matches that.{" "}
            <Link href="/" className="font-bold underline decoration-shell decoration-2 underline-offset-4">
              Show everything
            </Link>
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 pb-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((card) => (
              <EntryCardView key={`${card.kind}:${card.slug}`} card={card} />
            ))}
          </div>
        )}
      </main>
    </DexShell>
  );
}
