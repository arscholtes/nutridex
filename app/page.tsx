import { EntryCardView } from "../components/entry-card.tsx";
import { entryTypes, listEntries, type EntryKind } from "../lib/db/dex.ts";

const KINDS: { value: EntryKind; label: string }[] = [
  { value: "ingredient", label: "Ingredients" },
  { value: "compound", label: "Compounds" },
  { value: "effect", label: "Effects" },
];

type Search = { q?: string; kind?: string; type?: string };

/** The Dex home: search across ingredients, compounds and effects, filter by kind and type, and browse the cards. */
export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const kind = KINDS.find((k) => k.value === params.kind)?.value;
  const types = await entryTypes();
  const type = params.type && Object.values(types).some((list) => list.includes(params.type!)) ? params.type : undefined;
  const cards = await listEntries({ q: params.q, kind, type });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Foodi Dex</h1>
      <p className="mt-1 text-neutral-400">What is in your food, what it does, and what helps it work.</p>

      <form className="mt-6 flex flex-wrap gap-2" action="/">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search foods, compounds, effects"
          className="min-w-0 flex-1 basis-56 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-500"
        />
        <select name="kind" defaultValue={kind ?? ""} className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm">
          <option value="">Everything</option>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type ?? ""} className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm">
          <option value="">Any type</option>
          {KINDS.map((k) => (
            <optgroup key={k.value} label={k.label}>
              {types[k.value].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white">
          Search
        </button>
      </form>

      {cards.length === 0 ? (
        <p className="mt-8 text-neutral-400">Nothing in the Dex matches that.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <EntryCardView key={`${card.kind}:${card.slug}`} card={card} />
          ))}
        </div>
      )}
    </main>
  );
}
