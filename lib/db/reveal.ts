// Removes what someone has not encountered from what the web Dex shows, so no list, link or
// comparison gives a hidden entry away.
import type { CompoundEntry, DexPager, EffectEntry, EntryCard, EntryKind, IngredientEntry } from "./dex.ts";
import type { Revealed } from "./encounters.ts";

/** @return [boolean] whether an entry is unlocked */
export function isRevealed(kind: EntryKind, slug: string, r: Revealed): boolean {
  return (kind === "ingredient" ? r.foods : kind === "compound" ? r.compounds : r.effects).has(slug);
}

/**
 * Keeps only unlocked cards, and drops a stat that names a food not yet encountered.
 * @param cards [EntryCard[]] cards to show
 * @param r [Revealed] what is unlocked
 * @return [EntryCard[]] what may be seen
 */
export function scrubCards(cards: EntryCard[], r: Revealed): EntryCard[] {
  const hiddenFoods = new Set(cards.filter((c) => c.kind === "ingredient" && !r.foods.has(c.slug)).map((c) => c.name));
  return cards
    .filter((c) => isRevealed(c.kind, c.slug, r))
    .map((c) => ({ ...c, stats: c.stats.filter((s) => !(s.startsWith("Most in ") && hiddenFoods.has(s.slice("Most in ".length)))) }));
}

/** Steps to the nearest unlocked neighbour, keeping dex numbers. */
function scrubPager(pager: DexPager, slug: string, cards: EntryCard[], kind: EntryKind, r: Revealed): DexPager {
  const ofKind = cards.filter((c) => c.kind === kind);
  const at = ofKind.findIndex((c) => c.slug === slug);
  const step = (c: EntryCard | undefined) => (c ? { slug: c.slug, name: c.name, number: c.number, href: c.href } : null);
  return {
    ...pager,
    total: ofKind.filter((c) => isRevealed(kind, c.slug, r)).length,
    prev: step(ofKind.slice(0, at).reverse().find((c) => isRevealed(kind, c.slug, r))),
    next: step(ofKind.slice(at + 1).find((c) => isRevealed(kind, c.slug, r))),
  };
}

/** @return [IngredientEntry] a food's entry with hidden entries removed */
export function scrubIngredient(entry: IngredientEntry, r: Revealed, cards: EntryCard[]): IngredientEntry {
  return {
    ...entry,
    pager: scrubPager(entry.pager, entry.ingredient.slug, cards, "ingredient", r),
    compounds: entry.compounds.filter((c) => r.compounds.has(c.slug)).map((c) => ({ ...c, richest: c.richest && r.foods.has(c.richest.slug) ? c.richest : null })),
    absent: { none: entry.absent.none.filter((c) => r.compounds.has(c.slug)), unmeasured: entry.absent.unmeasured.filter((c) => r.compounds.has(c.slug)) },
    panel: entry.panel.map((p) => ({ ...p, locked: !r.compounds.has(p.slug) })),
    absorption: entry.absorption.filter((a) => r.compounds.has(a.compound.slug)),
    prep: entry.prep.filter((p) => r.compounds.has(p.compound.slug)),
  };
}

/** @return [CompoundEntry] a compound's entry with hidden entries removed */
export function scrubCompound(entry: CompoundEntry, r: Revealed, cards: EntryCard[]): CompoundEntry {
  return {
    ...entry,
    pager: scrubPager(entry.pager, entry.compound.slug, cards, "compound", r),
    foods: entry.foods.filter((f) => r.foods.has(f.slug)),
    absent: { none: entry.absent.none.filter((f) => r.foods.has(f.slug)), unmeasured: entry.absent.unmeasured.filter((f) => r.foods.has(f.slug)) },
    modifiers: entry.modifiers.map((m) => (m.modifierCompound && !r.compounds.has(m.modifierCompound.slug) ? { ...m, modifierCompound: null, condition: "another compound" } : m)),
    effects: entry.effects.filter((e) => r.effects.has(e.effect.slug)),
  };
}

/** @return [EffectEntry] an effect's page with hidden entries removed */
export function scrubEffect(entry: EffectEntry, r: Revealed, cards: EntryCard[]): EffectEntry {
  return {
    ...entry,
    pager: scrubPager(entry.pager, entry.effect.slug, cards, "effect", r),
    compounds: entry.compounds.filter((c) => r.compounds.has(c.compound.slug)),
    foods: entry.foods
      .filter((f) => r.compounds.has(f.compound.slug))
      .map((f) => ({ ...f, ranked: f.ranked.filter((food) => r.foods.has(food.slug)), unmeasured: f.unmeasured.filter((food) => r.foods.has(food.slug)) })),
  };
}
