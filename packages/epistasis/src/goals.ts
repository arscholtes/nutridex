// Step 7: score chosen goals from the recipe's totals and the evidence behind each compound.
import type { EngineSettings } from "./settings.ts";
import { convert } from "./units.ts";
import type { CompoundEffectFact, CompoundTotal, Grade, GoalScore } from "./types.ts";

/**
 * Score each goal: the sum over its compounds of amount ÷ reference amount × the weight of the
 * best grade linking that compound to the goal.
 * @param totals [CompoundTotal[]] totals per serving
 * @param facts [CompoundEffectFact[]] compound_effect facts
 * @param goals [string[]] effect slugs to score
 * @param settings [EngineSettings] grade weights and reference amounts
 * @return [Record<string, GoalScore>] per goal, its score and the compounds it could not score
 */
export function scoreGoals(totals: CompoundTotal[], facts: CompoundEffectFact[], goals: string[], settings: EngineSettings): Record<string, GoalScore> {
  return Object.fromEntries(
    goals.map((goal) => {
      const best = new Map<string, Grade>();
      for (const f of facts.filter((x) => x.effectSlug === goal)) {
        const current = best.get(f.compoundSlug);
        if (current === undefined || f.grade < current) best.set(f.compoundSlug, f.grade);
      }
      let score = 0;
      const unscored: string[] = [];
      for (const [compoundSlug, grade] of best) {
        const t = totals.find((x) => x.compoundSlug === compoundSlug);
        if (t === undefined) continue;
        const ref = settings.referenceAmounts[compoundSlug];
        if (t.amount === null || ref === undefined) {
          unscored.push(compoundSlug);
          continue;
        }
        score += (convert(t.amount, t.unit!, ref.unit) / ref.amount) * settings.gradeWeights[grade];
      }
      return [goal, { score, unscored }];
    }),
  );
}
