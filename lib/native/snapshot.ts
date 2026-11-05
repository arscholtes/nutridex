// Everything the native apps show, read through the same functions as the web Dex, so the engine's
// judgments and the claim bars have one implementation. `npm run export:native` writes it into the
// app; tests/native-snapshot.db.test.ts fails when the committed copy no longer matches.
import { readFileSync } from "node:fs";
import { compoundCreature, creatureSilhouette } from "../art/creature.ts";

export { creatureSilhouette };
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

export const SNAPSHOT_PATH = "apple/Shared/Resources/dex.json";
export const CREATURE_CATALOG = "apple/Shared/Resources/Creatures.xcassets";

/** A card with a line about the entry, built only from what the Dex already holds. */
export type NativeCard = EntryCard & { description: string };

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
  const entries = { ingredients: {} as Record<string, IngredientEntry>, compounds: {} as Record<string, CompoundEntry>, effects: {} as Record<string, EffectEntry> };
  for (const card of cards) {
    if (card.kind === "ingredient") entries.ingredients[card.slug] = (await ingredientEntry(card.slug, q))!;
    else if (card.kind === "compound") entries.compounds[card.slug] = (await compoundEntry(card.slug, q))!;
    else entries.effects[card.slug] = (await effectEntry(card.slug, q))!;
  }
  const snapshot: NativeSnapshot = {
    version: (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version,
    disclaimer: { title: DISCLAIMER_TITLE, intro: DISCLAIMER_INTRO, sections: NATIVE_DISCLAIMER_SECTIONS },
    palette: { untyped: swatch(null), types: Object.fromEntries(types.map((t) => [t, swatch(t)])) },
    skins: SKINS,
    cards: cards.map((card) => ({ ...card, description: describe(card, entries) })),
    reveals: reveals(entries),
    ...entries,
    sources: await sourceList(q),
  };
  return withStableIds(snapshot);
}

/** @return [string] the names joined as "A, B and C" */
function listOf(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** @return [string] "A vegetable" or "An egg" */
function aType(type: string): string {
  return `${/^[aeiou]/i.test(type) ? "An" : "A"} ${type}`;
}

/**
 * A line about an entry for someone who has not encountered it, from what the Dex already holds.
 * @param card [EntryCard] the entry's card
 * @param entries [object] every entry
 * @return [string] sentences that invent nothing
 */
function describe(card: EntryCard, entries: Pick<NativeSnapshot, "ingredients" | "compounds" | "effects">): string {
  if (card.kind === "ingredient") {
    const entry = entries.ingredients[card.slug];
    const sourceOf = [...new Set(entry.effects.filter((e) => e.minFoodPer100g !== null).map((e) => e.compound.name))];
    return [
      `${aType(card.type ?? "food")} with ${entry.measured} compounds measured.`,
      sourceOf.length > 0 ? `A source of ${listOf(sourceOf)}.` : "No nutrient in it reaches the bar for calling it a source.",
      ...card.stats.slice(1).map((s) => `${s}.`),
    ].join(" ");
  }
  if (card.kind === "compound") {
    const entry = entries.compounds[card.slug];
    const effects = [...new Set(entry.effects.map((e) => e.effect.name))];
    return [
      card.type && card.type !== "energy" ? `${aType(card.type)}.` : "",
      effects.length > 0 ? `Sourced effects: ${listOf(effects)}.` : "No sourced effect on file yet.",
      ...card.stats.map((s) => `${s}.`),
    ].filter(Boolean).join(" ");
  }
  const entry = entries.effects[card.slug];
  const foods = new Set(entry.foods.flatMap((f) => f.ranked.map((food) => food.slug)));
  return [`Behind it: ${listOf(entry.compounds.map((c) => c.compound.name))}.`, foods.size === 1 ? "1 food in the Dex reaches it." : `${foods.size} foods in the Dex reach it.`].join(" ");
}

/**
 * What marking each food as had reveals.
 * @param entries [object] every entry
 * @return [NativeSnapshot["reveals"]] by food slug
 */
function reveals(entries: Pick<NativeSnapshot, "ingredients" | "compounds">): NativeSnapshot["reveals"] {
  return Object.fromEntries(
    Object.entries(entries.ingredients).map(([slug, entry]) => [
      slug,
      {
        compounds: Object.entries(entries.compounds)
          .filter(([, c]) => {
            // A trace does not unlock a nutrient: where a claim sets a bar, the food must clear it.
            const bar = c.effects.find((e) => e.minFoodPer100g !== null)?.minFoodPer100g ?? null;
            if (bar === null) return c.foods.some((f) => f.slug === slug) || c.absent.unmeasured.some((f) => f.slug === slug);
            // The richest food always counts, so a nutrient no food clears the bar for can still be unlocked.
            return c.foods.some((f) => f.slug === slug && (f.amount >= bar || f.amount === c.foods[0].amount));
          })
          .map(([compound]) => compound),
        effects: [...new Set(entry.effects.map((e) => e.effect.slug))],
      },
    ]),
  );
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
