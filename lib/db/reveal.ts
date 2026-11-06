// Removes what someone has not encountered from what the web Dex shows, so no list, link or
// comparison gives a hidden entry away.
import type { CompoundEntry, DexPager, DexStep, EffectEntry, EntryKind, IngredientEntry } from "./dex.ts";
import type { Revealed } from "./encounters.ts";

/** @return [boolean] whether an entry is unlocked */
export function isRevealed(kind: EntryKind, slug: string, r: Revealed): boolean {
  return (kind === "ingredient" ? r.foods : kind === "compound" ? r.compounds : r.effects).has(slug);
}

/** Steps to the nearest unlocked neighbour, keeping dex numbers. */
function scrubPager(pager: DexPager, slug: string, steps: DexStep[], kind: EntryKind, r: Revealed): DexPager {
  const at = steps.findIndex((c) => c.slug === slug);
  return {
    ...pager,
    total: steps.filter((c) => isRevealed(kind, c.slug, r)).length,
    prev: steps.slice(0, at).reverse().find((c) => isRevealed(kind, c.slug, r)) ?? null,
    next: steps.slice(at + 1).find((c) => isRevealed(kind, c.slug, r)) ?? null,
  };
}

/** @return [IngredientEntry] a food's entry with hidden entries removed */
export function scrubIngredient(entry: IngredientEntry, r: Revealed, steps: DexStep[]): IngredientEntry {
  return {
    ...entry,
    pager: scrubPager(entry.pager, entry.ingredient.slug, steps, "ingredient", r),
    compounds: entry.compounds.filter((c) => r.compounds.has(c.slug)).map((c) => ({ ...c, richest: c.richest && r.foods.has(c.richest.slug) ? c.richest : null })),
    absent: { none: entry.absent.none.filter((c) => r.compounds.has(c.slug)), unmeasured: entry.absent.unmeasured.filter((c) => r.compounds.has(c.slug)) },
    panel: entry.panel.map((p) => ({ ...p, locked: !r.compounds.has(p.slug) })),
    tiles: entry.tiles.map((t) => ({ ...t, compounds: t.compounds.filter((c) => r.compounds.has(c.slug)) })).filter((t) => t.compounds.length > 0),
    absorption: entry.absorption.filter((a) => r.compounds.has(a.compound.slug)),
    prep: entry.prep.filter((p) => r.compounds.has(p.compound.slug)),
  };
}

/** @return [CompoundEntry] a compound's entry with hidden entries removed */
export function scrubCompound(entry: CompoundEntry, r: Revealed, steps: DexStep[]): CompoundEntry {
  return {
    ...entry,
    pager: scrubPager(entry.pager, entry.compound.slug, steps, "compound", r),
    foods: entry.foods.filter((f) => r.foods.has(f.slug)),
    absent: { none: entry.absent.none.filter((f) => r.foods.has(f.slug)), unmeasured: entry.absent.unmeasured.filter((f) => r.foods.has(f.slug)) },
    modifiers: entry.modifiers.map((m) => (m.modifierCompound && !r.compounds.has(m.modifierCompound.slug) ? { ...m, modifierCompound: null, condition: "another compound" } : m)),
    effects: entry.effects.filter((e) => r.effects.has(e.effect.slug)),
  };
}

/** @return [EffectEntry] an effect's page with hidden entries removed */
export function scrubEffect(entry: EffectEntry, r: Revealed, steps: DexStep[]): EffectEntry {
  return {
    ...entry,
    pager: scrubPager(entry.pager, entry.effect.slug, steps, "effect", r),
    compounds: entry.compounds.filter((c) => r.compounds.has(c.compound.slug)),
    foods: entry.foods
      .filter((f) => r.compounds.has(f.compound.slug))
      .map((f) => ({ ...f, ranked: f.ranked.filter((food) => r.foods.has(food.slug)), unmeasured: f.unmeasured.filter((food) => r.foods.has(food.slug)) })),
  };
}
