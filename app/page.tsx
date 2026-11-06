import Link from "next/link";
import { EntryCardView } from "../components/entry-card.tsx";
import { GameShell, HadComposer, Progress } from "../components/game.tsx";
import { dexCounts, listEntries, type EntryCard, type EntryKind } from "../lib/db/dex.ts";
import { viewer } from "../lib/viewer.ts";

const KINDS: { value: EntryKind; label: string }[] = [
  { value: "ingredient", label: "Foods" },
  { value: "compound", label: "Compounds" },
  { value: "effect", label: "Effects" },
];

type Search = { q?: string; kind?: string; type?: string; had?: string };

/** @return [string] the home link for a kind tab, keeping the words searched */
function tabHref(q: string | undefined, kind?: EntryKind): string {
  const query = new URLSearchParams({ ...(q ? { q } : {}), ...(kind ? { kind } : {}) }).toString();
  return query ? `/?${query}` : "/";
}

/** The Dex home: search across foods, compounds and effects, filter by kind and type, and browse the cards. */
export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const kind = KINDS.find((k) => k.value === params.kind)?.value;
  const { revealed } = await viewer();
  const totals = await dexCounts();
  const unlocked = await listEntries({ within: revealed });
  const typesOf = (k: EntryKind) => [...new Set(unlocked.filter((c: EntryCard) => c.kind === k).flatMap((c) => (c.type ? [c.type] : [])))].sort();
  const types: Record<EntryKind, string[]> = { ingredient: typesOf("ingredient"), compound: typesOf("compound"), effect: typesOf("effect") };
  const type = params.type && Object.values(types).some((list) => list.includes(params.type!)) ? params.type : undefined;
  const cards = await listEntries({ q: params.q, kind, type, within: revealed });
  const count = (k: EntryKind) => unlocked.filter((c) => c.kind === k).length;
  const tabs = [
    { label: "All", value: undefined, count: unlocked.length },
    ...KINDS.map((k) => ({ label: k.label, value: k.value, count: count(k.value) })),
  ];

  return (
    <GameShell>
      <main className="px-3.5 pb-3">
        <h1 className="sr-only">What is in your food, what it does, and what helps it work.</h1>
        <p className="dex-hero-line" aria-hidden>
          Your Dex.
        </p>
        <Progress unlocked={unlocked.length} total={totals.ingredient + totals.compound + totals.effect} />

        <nav className="mt-3 -mr-3.5 flex gap-2 overflow-x-auto pr-3.5 [scrollbar-width:none]" aria-label="Kinds of entry">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={tabHref(params.q, t.value)}
              aria-current={t.value === kind ? "page" : undefined}
              className="dex-chip"
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
            placeholder="Search your Dex"
            className="dex-field min-w-0 flex-1 basis-32 placeholder:text-ink-soft"
          />
          <select name="type" aria-label="Type" defaultValue={type ?? ""} className="dex-field w-28 text-sm font-bold sm:w-auto">
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
          <button type="submit" className="dex-button">
            Search
          </button>
        </form>

        {unlocked.length === 0 ? (
          <p className="mt-8 pb-6">Your Dex is empty. Tell it what you had, down below, to unlock your first entry.</p>
        ) : cards.length === 0 ? (
          <p className="mt-8 pb-6">
            Nothing you have unlocked matches that.{" "}
            <Link href="/" className="font-bold underline decoration-accent decoration-2 underline-offset-4">
              Show everything
            </Link>
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((card) => (
              <EntryCardView key={`${card.kind}:${card.slug}`} card={card} />
            ))}
          </div>
        )}
        <HadComposer had={params.had} />
      </main>
    </GameShell>
  );
}
