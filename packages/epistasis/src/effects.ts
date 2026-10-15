// Step 6: what the recipe's compounds do, grouped by effect, benefits before risks.
import { presentCompounds } from "./presence.ts";
import type { AmountOf, CompoundEffectFact, EffectRollup, Grade } from "./types.ts";

const DIRECTION_ORDER = { benefit: 0, risk: 1, neutral: 2 };

/**
 * Group the effects of present compounds, each with its contributing compounds, best evidence
 * grade, and the onset reported with that grade.
 * @param totals [AmountOf[]] totals
 * @param facts [CompoundEffectFact[]] compound_effect facts
 * @return [EffectRollup[]] benefits, then risks, then neutral; best grade first within each
 */
export function rollUpEffects(totals: AmountOf[], facts: CompoundEffectFact[]): EffectRollup[] {
  const present = presentCompounds(totals);
  const byEffect = Map.groupBy(facts.filter((f) => present.has(f.compoundSlug)), (f) => f.effectSlug);
  return [...byEffect]
    .map(([effectSlug, rows]) => {
      const best = rows.reduce((a, b) => (b.grade < a.grade ? b : a));
      return {
        effectSlug,
        direction: best.direction,
        bestGrade: best.grade as Grade,
        compounds: [...new Set(rows.map((r) => r.compoundSlug))],
        onset: best.onset,
      };
    })
    .sort((a, b) => DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction] || a.bestGrade.localeCompare(b.bestGrade));
}
