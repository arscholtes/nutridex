// Everything the native apps show, read through the same functions as the web Dex, so the engine's
// judgments and the claim bars have one implementation. `npm run export:native` writes it into the
// app; tests/native-snapshot.db.test.ts fails when the committed copy no longer matches.
import { readFileSync } from "node:fs";
import { compoundCreature } from "../art/creature.ts";
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

export const SNAPSHOT_PATH = "apple/NutriDex/Resources/dex.json";
export const CREATURE_CATALOG = "apple/NutriDex/Resources/Creatures.xcassets";

type TypeSwatch = { color: string; textOnColor: "light" | "dark" };

export type NativeSnapshot = {
  version: string;
  disclaimer: { title: string; intro: string; sections: { heading: string; body: string }[] };
  palette: { untyped: TypeSwatch; types: Record<string, TypeSwatch> };
  cards: EntryCard[];
  ingredients: Record<string, IngredientEntry>;
  compounds: Record<string, CompoundEntry>;
  effects: Record<string, EffectEntry>;
  sources: SourceUse[];
};

/** @return [string] the asset catalog name of an entry's creature */
export function creatureAssetName(kind: EntryKind, slug: string): string {
  return `${kind === "ingredient" ? "food" : kind}-${slug}`;
}

/** @return [TypeSwatch] a type's colour, and whether light or dark text reads on it */
function swatch(type: string | null): TypeSwatch {
  const color = typeColor(type);
  return { color, textOnColor: isDark(color) ? "light" : "dark" };
}

/**
 * Database ids change with every database, so each becomes an id numbered by where it first appears.
 * @param value [T] the snapshot
 * @return [T] the snapshot with every id replaced consistently
 */
function withStableIds<T>(value: T): T {
  const stable = new Map<string, string>();
  return JSON.parse(
    JSON.stringify(value).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (id) => {
      if (!stable.has(id)) stable.set(id, `id-${String(stable.size + 1).padStart(4, "0")}`);
      return stable.get(id)!;
    }),
  ) as T;
}

/**
 * Reads everything the native apps show.
 * @param q [typeof sql] the connection to read through
 * @return [Promise<NativeSnapshot>] the snapshot, with stable ids
 */
export async function buildSnapshot(q: typeof sql = sql): Promise<NativeSnapshot> {
  const cards = await listEntries({}, q);
  const types = Object.values(await entryTypes(q)).flat();
  const snapshot: NativeSnapshot = {
    version: (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version,
    disclaimer: { title: DISCLAIMER_TITLE, intro: DISCLAIMER_INTRO, sections: NATIVE_DISCLAIMER_SECTIONS },
    palette: { untyped: swatch(null), types: Object.fromEntries(types.map((t) => [t, swatch(t)])) },
    cards,
    ingredients: {},
    compounds: {},
    effects: {},
    sources: await sourceList(q),
  };
  for (const card of cards) {
    if (card.kind === "ingredient") snapshot.ingredients[card.slug] = (await ingredientEntry(card.slug, q))!;
    else if (card.kind === "compound") snapshot.compounds[card.slug] = (await compoundEntry(card.slug, q))!;
    else snapshot.effects[card.slug] = (await effectEntry(card.slug, q))!;
  }
  return withStableIds(snapshot);
}

/**
 * The SVG behind each food's and compound's creature.
 * @param snapshot [NativeSnapshot] what the apps will show
 * @return [{ name: string; svg: string }[]] one per asset
 */
export function creatureAssets(snapshot: NativeSnapshot): { name: string; svg: string }[] {
  return snapshot.cards.flatMap((card) => {
    if (card.kind === "effect") return [];
    const svg = card.kind === "ingredient" ? readFileSync(`public${card.imageUrl}`, "utf8") : compoundCreature({ slug: card.slug, name: card.name, class: card.compoundClass });
    return [{ name: creatureAssetName(card.kind, card.slug), svg }];
  });
}
