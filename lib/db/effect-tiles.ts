// How a food's effects become tiles. Pure: no database.
import type { Grade } from "epistasis";

// A claim's bar is 15% of the nutrient's reference value (EU Regulation 1169/2011, Annex XIII Part A),
// so the bar gives back the reference value without a second copy of the table.
const BAR_SHARE_OF_REFERENCE = 0.15;

const LARGE_FROM = 1;
const WIDE_FROM = 0.4;
// Size only means something if most tiles are small, however rich the food.
const MOST_LARGE = 1;
const MOST_WIDE = 3;

export type BentoSize = "large" | "wide" | "small";

export type BentoCompound = { slug: string; name: string; class: string | null; dailyShare: number | null };

export type BentoTile = {
  effect: { slug: string; name: string; direction: string; bodySystem: string | null };
  size: BentoSize;
  grade: Grade;
  /** The biggest share of a daily amount behind this effect; null where no claim sets a bar. */
  topShare: number | null;
  /** Most of your daily amount first. */
  compounds: BentoCompound[];
  /** What the source says about the leading nutrient. */
  wording: string | null;
  /** What a trial used, for a claim resting on one rather than on what a food holds. */
  dose: string | null;
};

type TileClaim = {
  effect: BentoTile["effect"];
  compound: { slug: string; name: string; class: string | null };
  summary: string | null;
  doseContext: string | null;
  minFoodPer100g: number | null;
  grade: Grade;
};

/**
 * @param amount [number | null] how much 100 g of a food holds
 * @param bar [number | null] the amount per 100 g a claim requires, in the same unit
 * @return [number | null] the share of a daily amount in 100 g, where 1 is all of it; null when either is unknown
 */
export function dailyShare(amount: number | null, bar: number | null): number | null {
  return amount === null || bar === null ? null : (amount * BAR_SHARE_OF_REFERENCE) / bar;
}

/**
 * A food's effects as tiles: the more of your daily amount behind an effect, the earlier and bigger it is.
 * @param claims [TileClaim[]] the claims that apply to this food
 * @param amounts [Map] what 100 g of this food holds, by compound slug
 * @return [BentoTile[]] one per effect, biggest first
 */
export function bentoTiles(claims: TileClaim[], amounts: Map<string, { amount: number | null }>): BentoTile[] {
  const scored = [...Map.groupBy(claims, (c) => c.effect.slug).values()].map((group) => {
    const compounds = group
      .map((c) => ({ ...c.compound, dailyShare: dailyShare(amounts.get(c.compound.slug)?.amount ?? null, c.minFoodPer100g) }))
      .sort((a, b) => (b.dailyShare ?? -1) - (a.dailyShare ?? -1) || a.name.localeCompare(b.name));
    const shares = compounds.flatMap((c) => (c.dailyShare === null ? [] : [c.dailyShare]));
    const leading = group.find((c) => c.compound.slug === compounds[0].slug)!;
    return {
      score: shares.reduce((sum, share) => sum + share, 0),
      tile: {
        effect: group[0].effect,
        grade: group.reduce((best, c) => (c.grade < best ? c.grade : best), group[0].grade),
        topShare: shares.length > 0 ? Math.max(...shares) : null,
        compounds,
        wording: leading.summary,
        dose: group.find((c) => c.minFoodPer100g === null && c.doseContext !== null)?.doseContext ?? null,
      },
    };
  });
  scored.sort((a, b) => b.score - a.score || a.tile.effect.name.localeCompare(b.tile.effect.name));

  let large = 0;
  let wide = 0;
  const headlined = new Set<string>();
  return scored.map(({ tile }) => {
    const share = tile.topShare ?? 0;
    const leading = tile.compounds[0].slug;
    if (tile.dose !== null) return { ...tile, size: "wide" };
    // A nutrient behind many effects would otherwise fill the grid with one number.
    if (headlined.has(leading)) return { ...tile, size: "small" };
    if (share >= LARGE_FROM && large < MOST_LARGE) {
      large++;
      headlined.add(leading);
      return { ...tile, size: "large" };
    }
    if (share >= WIDE_FROM && wide < MOST_WIDE) {
      wide++;
      headlined.add(leading);
      return { ...tile, size: "wide" };
    }
    return { ...tile, size: "small" };
  });
}
