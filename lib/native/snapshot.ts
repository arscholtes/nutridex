// Everything the native apps show, read through the same functions as the web Dex, so the engine's
// judgments and the claim bars have one implementation. `npm run export:native` writes it into the
// app as one SQLite file, each entry stored on its own and compressed, so an app opens only what it
// shows. tests/native-snapshot.db.test.ts fails when the committed copy no longer matches.
import { readFileSync, renameSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { compoundCreature, creatureSilhouette } from "../art/creature.ts";
import { isDark, typeColor } from "../art/palette.ts";
import { sql } from "../db/client.ts";
import {
  compoundEntry,
  effectEntry,
  entryTypes,
  ingredientEntry,
  listEntries,
  sourceList,
  type CompoundEntry,
  type EffectEntry,
  type EntryCard,
  type EntryKind,
  type IngredientEntry,
  type SourceUse,
} from "../db/dex.ts";
import { DISCLAIMER_INTRO, DISCLAIMER_TITLE, NATIVE_DISCLAIMER_SECTIONS } from "../disclaimer/text.ts";
import { SKINS, type SkinDefinition } from "../skins.ts";
import { NO_CLAIMS_ON_ALCOHOL } from "../db/claim-limits.ts";
import { creatureArtName } from "./art.ts";

export { creatureSilhouette };

export const SNAPSHOT_PATH = "apple/Shared/Resources/dex.sqlite";
export const CREATURE_CATALOG = "apple/Shared/Resources/Creatures.xcassets";

/** A card, with what an app needs without opening its entry. */
export type NativeCard = EntryCard & {
  description: string;
  /** The asset catalog name of its creature, shared by every food that wears the same drawing. */
  art: string | null;
  /** The ids of the sources behind its entry. */
  sources: string[];
};

/** A food's row in the Mac's comparison table. */
export type CompareFood = { slug: string; name: string; number: string; panel: IngredientEntry["panel"] };

/** A search the web Dex ran, and its results in order, for the apps to check they rank the same way. */
export type SearchCheck = { query: string; kind: EntryKind | null; results: string[] };

type TypeSwatch = { color: string; textOnColor: "light" | "dark" };

export type NativeSnapshot = {
  version: string;
  disclaimer: { title: string; intro: string; sections: { heading: string; body: string }[] };
  palette: { untyped: TypeSwatch; types: Record<string, TypeSwatch> };
  skins: readonly SkinDefinition[];
  cards: NativeCard[];
  /** What marking each food as had reveals: the compounds it carries and the effects it clears a bar for. */
  reveals: Record<string, { compounds: string[]; effects: string[] }>;
  ingredients: Record<string, IngredientEntry>;
  compounds: Record<string, CompoundEntry>;
  effects: Record<string, EffectEntry>;
  sources: SourceUse[];
  compare: CompareFood[];
  searchChecks: SearchCheck[];
};

/** Searches the apps must rank as the web does: a whole name, a misspelling, a word in many names, and one kind. */
const SEARCH_CHECKS: { query: string; kind: EntryKind | null }[] = [
  { query: "carrot", kind: null },
  { query: "tumeric", kind: null },
  { query: "vitamin", kind: null },
  { query: "vitamin", kind: "compound" },
  { query: "oil", kind: null },
  { query: "pepper", kind: null },
  { query: "beta", kind: null },
];

/** How many food entries are read from the database at once; the connection pool holds five. */
const FOOD_READS_AT_ONCE = 5;

/** Where the snapshot's parts go: into memory for a test, or into the file the apps bundle. */
type SnapshotSink = {
  meta(key: string, json: string): void;
  entry(kind: EntryKind, slug: string, json: string): void;
};

/** What a compound's entry decides about which foods unlock it, kept after the entry itself is written. */
type CompoundUnlock = { bar: number | null; amounts: Map<string, number>; top: number | undefined; unmeasured: Set<string> };

/** @return [TypeSwatch] a type's colour, and whether light or dark text reads on it */
function swatch(type: string | null): TypeSwatch {
  const color = typeColor(type);
  return { color, textOnColor: isDark(color) ? "light" : "dark" };
}

/**
 * Database ids change with every database, so each becomes an id numbered by where it first appears.
 * One instance runs over every part in the order they are written, so a source keeps one id everywhere.
 * @return [(value: unknown) => string] the part as JSON, with every id replaced consistently
 */
function stableIds(): (value: unknown) => string {
  const stable = new Map<string, string>();
  return (value) =>
    JSON.stringify(value).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (id) => {
      if (!stable.has(id)) stable.set(id, `id-${String(stable.size + 1).padStart(4, "0")}`);
      return stable.get(id)!;
    });
}

/**
 * Runs work over items a few at a time, and hands each result on in the items' order.
 * @param items [T[]] what to work on
 * @param width [number] how many run at once
 * @param work [(item: T) => Promise<R>] the work for one item
 * @param use [(result: R, item: T) => void] called once per item, in order
 */
async function inOrder<T, R>(items: T[], width: number, work: (item: T) => Promise<R>, use: (result: R, item: T) => void): Promise<void> {
  const running: Promise<R>[] = [];
  let started = 0;
  for (let i = 0; i < items.length; i++) {
    while (started < items.length && started - i < width) {
      const job = work(items[started]);
      // Rejections surface when each job is awaited in order; this only stops Node reporting them early.
      job.catch(() => undefined);
      running[started++] = job;
    }
    use(await running[i], items[i]);
    delete running[i];
  }
}

/**
 * Reads everything the native apps show and hands it to a sink, one part at a time, so a Dex of
 * thousands of foods never has to sit in memory whole.
 * @param sink [SnapshotSink] where each part goes
 * @param q [typeof sql] the connection to read through
 * @param progress [(done: number, total: number) => void] called as foods are read
 * @return [Promise<NativeCard[]>] the cards written
 */
async function writeSnapshot(sink: SnapshotSink, q: typeof sql, progress?: (done: number, total: number) => void): Promise<NativeCard[]> {
  const stable = stableIds();
  const cards = await listEntries({}, q);
  const descriptions = new Map<string, string>();
  const sourcesOf = new Map<string, string[]>();
  const key = (card: { kind: EntryKind; slug: string }) => `${card.kind}:${card.slug}`;
  const ofKind = (kind: EntryKind) => cards.filter((c) => c.kind === kind);
  const keep = (card: EntryCard, entry: { sources: { id: string }[] }, description: string) => {
    descriptions.set(key(card), description);
    sourcesOf.set(key(card), [...new Set(entry.sources.map((s) => s.id))]);
  };

  const unlocks = new Map<string, CompoundUnlock>();
  for (const card of ofKind("compound")) {
    const entry = (await compoundEntry(card.slug, q))!;
    sink.entry("compound", card.slug, stable(entry));
    keep(card, entry, describeCompound(card, entry));
    unlocks.set(card.slug, {
      bar: entry.effects.find((e) => e.minFoodPer100g !== null)?.minFoodPer100g ?? null,
      amounts: new Map(entry.foods.map((f) => [f.slug, f.amount])),
      top: entry.foods[0]?.amount,
      unmeasured: new Set(entry.absent.unmeasured.map((f) => f.slug)),
    });
  }

  for (const card of ofKind("effect")) {
    const entry = (await effectEntry(card.slug, q))!;
    sink.entry("effect", card.slug, stable(entry));
    keep(card, entry, describeEffect(entry));
  }

  const reveals: NativeSnapshot["reveals"] = {};
  const compare: CompareFood[] = [];
  const foods = ofKind("ingredient");
  let done = 0;
  await inOrder(foods, FOOD_READS_AT_ONCE, async (card) => (await ingredientEntry(card.slug, q))!, (entry, card) => {
    sink.entry("ingredient", card.slug, stable(entry));
    keep(card, entry, describeFood(card, entry));
    reveals[card.slug] = { compounds: unlockedBy(card.slug, entry.bearsClaims, unlocks), effects: [...new Set(entry.effects.map((e) => e.effect.slug))] };
    compare.push({ slug: card.slug, name: card.name, number: card.number, panel: entry.panel });
    progress?.(++done, foods.length);
  });

  const nativeCards: NativeCard[] = cards.map((card) => ({ ...card, description: descriptions.get(key(card))!, art: creatureArtName(card), sources: sourcesOf.get(key(card))! }));
  const types = Object.values(await entryTypes(q)).flat();
  const searchChecks: SearchCheck[] = [];
  for (const check of SEARCH_CHECKS) {
    const results = await listEntries({ q: check.query, kind: check.kind ?? undefined }, q);
    searchChecks.push({ ...check, results: results.map((c) => key(c)) });
  }
  sink.meta(
    "head",
    stable({
      version: (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version,
      disclaimer: { title: DISCLAIMER_TITLE, intro: DISCLAIMER_INTRO, sections: NATIVE_DISCLAIMER_SECTIONS },
      palette: { untyped: swatch(null), types: Object.fromEntries(types.map((t) => [t, swatch(t)])) },
      skins: SKINS,
      searchChecks,
    }),
  );
  sink.meta("cards", stable(nativeCards));
  sink.meta("reveals", stable(reveals));
  sink.meta("sources", stable(await sourceList(q)));
  sink.meta("compare", stable(compare));
  return JSON.parse(stable(nativeCards)) as NativeCard[];
}

/**
 * Reads everything the native apps show into memory, as the bundled file holds it.
 * @param q [typeof sql] the connection to read through
 * @return [Promise<NativeSnapshot>] the snapshot, with stable ids
 */
export async function buildSnapshot(q: typeof sql = sql): Promise<NativeSnapshot> {
  const meta: Record<string, unknown> = {};
  const entries = { ingredient: {} as Record<string, unknown>, compound: {} as Record<string, unknown>, effect: {} as Record<string, unknown> };
  await writeSnapshot({ meta: (k, json) => (meta[k] = JSON.parse(json)), entry: (kind, slug, json) => (entries[kind][slug] = JSON.parse(json)) }, q);
  return assemble(meta, entries);
}

/**
 * Writes the file the native apps bundle. It is written beside the target and moved into place only
 * when complete, so a failed export leaves the old file rather than half of a new one.
 * @param path [string] where the file goes
 * @param q [typeof sql] the connection to read through
 * @param progress [(done: number, total: number) => void] called as foods are read
 * @return [Promise<NativeCard[]>] the cards written
 */
export async function writeSnapshotFile(path: string, q: typeof sql = sql, progress?: (done: number, total: number) => void): Promise<NativeCard[]> {
  const partial = `${path}.partial`;
  rmSync(partial, { force: true });
  const file = new DatabaseSync(partial);
  try {
    file.exec(`
      pragma journal_mode = off;
      create table meta (key text primary key, size integer not null, body blob not null);
      create table entry (kind text not null, slug text not null, size integer not null, body blob not null, primary key (kind, slug));
    `);
    const putMeta = file.prepare("insert into meta (key, size, body) values (?, ?, ?)");
    const putEntry = file.prepare("insert into entry (kind, slug, size, body) values (?, ?, ?, ?)");
    const packed = (json: string) => [Buffer.byteLength(json), deflateRawSync(Buffer.from(json, "utf8"), { level: 9 })] as const;
    file.exec("begin");
    const cards = await writeSnapshot({ meta: (k, json) => putMeta.run(k, ...packed(json)), entry: (kind, slug, json) => putEntry.run(kind, slug, ...packed(json)) }, q, progress);
    file.exec("commit");
    file.exec("vacuum");
    file.close();
    renameSync(partial, path);
    return cards;
  } catch (error) {
    if (file.isOpen) file.close();
    rmSync(partial, { force: true });
    throw error;
  }
}

/**
 * Reads the file the native apps bundle back into one snapshot.
 * @param path [string] the file
 * @return [NativeSnapshot] everything in it
 */
export function readSnapshotFile(path: string): NativeSnapshot {
  const file = new DatabaseSync(path, { readOnly: true });
  try {
    const open = (row: { size: number; body: Uint8Array }) => {
      const json = inflateRawSync(row.body).toString("utf8");
      if (Buffer.byteLength(json) !== row.size) throw new Error(`a part of ${path} inflates to ${Buffer.byteLength(json)} bytes, not the ${row.size} it records`);
      return JSON.parse(json) as unknown;
    };
    const meta = Object.fromEntries((file.prepare("select key, size, body from meta").all() as { key: string; size: number; body: Uint8Array }[]).map((r) => [r.key, open(r)]));
    const entries = { ingredient: {} as Record<string, unknown>, compound: {} as Record<string, unknown>, effect: {} as Record<string, unknown> };
    for (const row of file.prepare("select kind, slug, size, body from entry").all() as { kind: EntryKind; slug: string; size: number; body: Uint8Array }[]) {
      entries[row.kind][row.slug] = open(row);
    }
    return assemble(meta, entries);
  } finally {
    file.close();
  }
}

/** @return [NativeSnapshot] the parts, put together as one snapshot */
function assemble(meta: Record<string, unknown>, entries: Record<EntryKind, Record<string, unknown>>): NativeSnapshot {
  const head = meta.head as Pick<NativeSnapshot, "version" | "disclaimer" | "palette" | "skins" | "searchChecks">;
  return {
    ...head,
    cards: meta.cards as NativeCard[],
    reveals: meta.reveals as NativeSnapshot["reveals"],
    ingredients: entries.ingredient as NativeSnapshot["ingredients"],
    compounds: entries.compound as NativeSnapshot["compounds"],
    effects: entries.effect as NativeSnapshot["effects"],
    sources: meta.sources as SourceUse[],
    compare: meta.compare as CompareFood[],
  };
}

/**
 * The compounds marking a food as had unlocks.
 * @param food [string] the food's slug
 * @param unlocks [Map<string, CompoundUnlock>] each compound's bar and amounts, in dex order
 * @return [string[]] compound slugs, in dex order
 */
function unlockedBy(food: string, bearsClaims: boolean, unlocks: Map<string, CompoundUnlock>): string[] {
  return [...unlocks].flatMap(([compound, u]) => {
    const amount = u.amounts.get(food);
    // A trace does not unlock a nutrient: where a claim sets a bar, the food must clear it, and a drink that may
    // bear no claim clears none.
    if (u.bar === null) return amount !== undefined || u.unmeasured.has(food) ? [compound] : [];
    // The richest food always counts, so a nutrient no food clears the bar for can still be unlocked.
    return amount !== undefined && ((bearsClaims && amount >= u.bar) || amount === u.top) ? [compound] : [];
  });
}

/** @return [string] the names joined as "A, B and C" */
function listOf(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** @return [string] "A vegetable" or "An egg" */
function aType(type: string): string {
  return `${/^[aeiou]/i.test(type) ? "An" : "A"} ${type}`;
}

/** @return [string] a line about a food for someone who has not encountered it, inventing nothing */
function describeFood(card: EntryCard, entry: IngredientEntry): string {
  const sourceOf = [...new Set(entry.effects.filter((e) => e.minFoodPer100g !== null).map((e) => e.compound.name))];
  return [
    `${aType(card.type ?? "food")} with ${entry.measured} compounds measured.`,
    !entry.bearsClaims
      ? NO_CLAIMS_ON_ALCOHOL
      : sourceOf.length > 0 ? `A source of ${listOf(sourceOf)}.` : "No nutrient in it reaches the bar for calling it a source.",
    ...card.stats.slice(1).map((s) => `${s}.`),
  ].join(" ");
}

/** @return [string] a line about a compound for someone who has not encountered it, inventing nothing */
function describeCompound(card: EntryCard, entry: CompoundEntry): string {
  const effects = [...new Set(entry.effects.map((e) => e.effect.name))];
  return [
    card.type && card.type !== "energy" ? `${aType(card.type)}.` : "",
    effects.length > 0 ? `Sourced effects: ${listOf(effects)}.` : "No sourced effect on file yet.",
    ...card.stats.map((s) => `${s}.`),
  ]
    .filter(Boolean)
    .join(" ");
}

/** @return [string] a line about an effect for someone who has not encountered it, inventing nothing */
function describeEffect(entry: EffectEntry): string {
  const foods = new Set(entry.foods.flatMap((f) => f.ranked.map((food) => food.slug)));
  return [`Behind it: ${listOf(entry.compounds.map((c) => c.compound.name))}.`, foods.size === 1 ? "1 food in the Dex reaches it." : `${foods.size} foods in the Dex reach it.`].join(" ");
}

/**
 * The SVG behind each creature the apps bundle, once per image however many cards wear it.
 * @param cards [NativeCard[]] the cards the apps show
 * @return [{ name: string; svg: string }[]] one per image
 */
export function creatureAssets(cards: NativeCard[]): { name: string; svg: string }[] {
  const assets = new Map<string, string>();
  for (const card of cards) {
    if (card.art === null || assets.has(card.art)) continue;
    assets.set(card.art, card.kind === "ingredient" ? readFileSync(`public${card.imageUrl}`, "utf8") : compoundCreature({ slug: card.slug, name: card.name, class: card.compoundClass }));
  }
  return [...assets].map(([name, svg]) => ({ name, svg }));
}
