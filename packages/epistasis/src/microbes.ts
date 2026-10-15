// The microbiome feed check: which gut microbes the recipe would feed, if the person has them.
import type { Grade, AmountOf, FeedFlag, MicrobeMetaboliteFact, MicrobeSubstrateFact } from "./types.ts";
import { presentCompounds } from "./presence.ts";
import { convert } from "./units.ts";

/**
 * For each microbe the recipe feeds or holds back: what feeds it (in grams), its score of
 * measured grams × evidence weight, what it would make, and what in the recipe holds it back.
 * @param totals [AmountOf[]] totals per serving
 * @param substrates [MicrobeSubstrateFact[]] microbe_substrate facts
 * @param metabolites [MicrobeMetaboliteFact[]] microbe_metabolite facts
 * @param gradeWeights [Record<Grade, number>] evidence weights
 * @return [FeedFlag[]] highest score first
 */
export function feedCheck(
  totals: AmountOf[],
  substrates: MicrobeSubstrateFact[],
  metabolites: MicrobeMetaboliteFact[],
  gradeWeights: Record<Grade, number>,
): FeedFlag[] {
  const present = presentCompounds(totals);
  const grams = (slug: string) => {
    const t = totals.find((x) => x.compoundSlug === slug)!;
    return t.amount === null ? null : convert(t.amount, t.unit!, "g");
  };
  const byMicrobe = Map.groupBy(substrates.filter((s) => present.has(s.compoundSlug)), (s) => s.microbeSlug);
  return [...byMicrobe]
    .map(([microbeSlug, rows]) => {
      const fed = rows.filter((r) => r.relationship !== "inhibited-by");
      const feeds = fed.map((r) => ({ compoundSlug: r.compoundSlug, grams: grams(r.compoundSlug) }));
      const fedBy = new Set(fed.map((r) => r.compoundSlug));
      return {
        microbeSlug,
        score: fed.reduce((sum, r) => sum + (grams(r.compoundSlug) ?? 0) * gradeWeights[r.grade], 0),
        feeds,
        metabolites:
          fed.length === 0
            ? []
            : metabolites
                .filter((m) => m.microbeSlug === microbeSlug && (m.substrateCompoundSlug === null || fedBy.has(m.substrateCompoundSlug)))
                .map((m) => m.productCompoundSlug),
        heldBackBy: rows.filter((r) => r.relationship === "inhibited-by").map((r) => r.compoundSlug),
      };
    })
    .sort((a, b) => b.score - a.score);
}
