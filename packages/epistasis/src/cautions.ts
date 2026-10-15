// Step 5: the cautions that apply to what the recipe contains, plus excess over upper limits.
import { presentCompounds } from "./presence.ts";
import { checkExcess } from "./stack.ts";
import { convert, formatAmount } from "./units.ts";
import type { AmountOf, CautionFact, CautionFlag, UpperLimitFact } from "./types.ts";

const INTERACTION_ADVICE = "Ask a pharmacist or doctor before combining them.";

/**
 * Union of compound and ingredient cautions that apply, then an excess warning for each total
 * above its compound's upper limit. A drug interaction carries advice to ask a professional.
 * @param totals [AmountOf[]] totals per serving
 * @param ingredientSlugs [string[]] the recipe's ingredients
 * @param cautions [CautionFact[]] caution facts
 * @param upperLimits [UpperLimitFact[]] sourced upper limits
 * @return [CautionFlag[]] each applicable caution once, then excess warnings
 */
export function collectCautions(totals: AmountOf[], ingredientSlugs: string[], cautions: CautionFact[], upperLimits: UpperLimitFact[]): CautionFlag[] {
  const present = presentCompounds(totals);
  const seen = new Set<string>();
  const flags: CautionFlag[] = [];
  for (const c of cautions) {
    const applies = (c.compoundSlug !== null && present.has(c.compoundSlug)) || (c.ingredientSlug !== null && ingredientSlugs.includes(c.ingredientSlug));
    const key = JSON.stringify([c.kind, c.summary, c.compoundSlug, c.ingredientSlug]);
    if (!applies || seen.has(key)) continue;
    seen.add(key);
    const flag: CautionFlag = { kind: c.kind, summary: c.summary, grade: c.grade, compoundSlug: c.compoundSlug, ingredientSlug: c.ingredientSlug };
    flags.push(c.kind === "drug-interaction" ? { ...flag, advice: INTERACTION_ADVICE } : flag);
  }
  for (const check of checkExcess(totals, upperLimits)) {
    if (check.status !== "over") continue;
    const limit = check.upperLimit!;
    flags.push({
      kind: "excess",
      summary: `${formatAmount(convert(check.amount, check.unit, limit.unit))} ${limit.unit} of ${check.compoundSlug} per serving, above the ${formatAmount(limit.amount)} ${limit.unit} upper limit`,
      grade: null,
      compoundSlug: check.compoundSlug,
      ingredientSlug: null,
    });
  }
  return flags;
}
