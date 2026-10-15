// Whether a recipe contains a compound at all, as modifiers, cautions and effects all need to know.
import type { AmountOf } from "./types.ts";

/**
 * The compounds a recipe contains: a measured amount above zero, or linked with no measurement.
 * @param totals [AmountOf[]] totals
 * @return [Set<string>] compound slugs
 */
export function presentCompounds(totals: AmountOf[]): Set<string> {
  return new Set(totals.filter((t) => t.amount === null || t.amount > 0).map((t) => t.compoundSlug));
}
