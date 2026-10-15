// Step 4: test each absorption modifier against the recipe.
import { presentCompounds } from "./presence.ts";
import type { EngineSettings } from "./settings.ts";
import { convert, formatAmount } from "./units.ts";
import type { AbsorptionFlag, CompoundTotal, ModifierFact } from "./types.ts";

/** Conditions the engine can test: a compound's total at or above a threshold setting. */
const CONDITIONS: Record<string, { compoundSlug: string; noun: string; threshold: (s: EngineSettings) => number; suggestion: string }> = {
  "dietary fat present": {
    compoundSlug: "total-fat",
    noun: "fat",
    threshold: (s) => s.fatThresholdG,
    suggestion: "Add a fat, such as olive oil",
  },
};

/**
 * Flag each modifier whose target the recipe contains: enhanced, reduced, a missed opportunity,
 * or unknown when missing amounts leave a condition untestable. Rules that say the same thing
 * about one compound (same modifier or condition, same direction) make one flag carrying the
 * best grade and every rule's id.
 * @param totals [CompoundTotal[]] the recipe's totals per serving
 * @param ingredientSlugs [string[]] the recipe's ingredients, to tell unmeasured from absent
 * @param modifiers [ModifierFact[]] absorption_modifier facts
 * @param settings [EngineSettings] thresholds
 * @return [AbsorptionFlag[]] one per modifier that applies
 * @throws when a modifier names a condition the engine cannot test
 */
export function checkModifiers(
  totals: CompoundTotal[],
  ingredientSlugs: string[],
  modifiers: ModifierFact[],
  settings: EngineSettings,
): AbsorptionFlag[] {
  const present = presentCompounds(totals);
  const byClaim = new Map<string, AbsorptionFlag>();
  for (const m of modifiers) {
    if (!present.has(m.targetCompoundSlug)) continue;
    const base = { compoundSlug: m.targetCompoundSlug, grade: m.grade, basis: m.basis, ruleIds: [m.id] };
    const add = (flag: AbsorptionFlag) => {
      const key = JSON.stringify([m.targetCompoundSlug, m.modifierCompoundSlug ?? m.condition, m.direction]);
      const same = byClaim.get(key);
      if (!same) return void byClaim.set(key, flag);
      if (flag.grade < same.grade) same.grade = flag.grade;
      if (flag.basis === "measured") same.basis = "measured";
      same.ruleIds.push(m.id);
    };
    if (m.modifierCompoundSlug !== null) {
      const name = m.modifierCompoundSlug;
      if (present.has(name)) {
        add({ ...base, status: m.direction === "enhances" ? "enhanced" : "reduced", reason: `${name} is in the recipe` });
      } else if (m.direction === "enhances") {
        const carrier = m.modifierFoundIn.length > 0 ? m.modifierFoundIn.join(" or ") : "a source";
        add({ ...base, status: "missed", reason: `no ${name} in the recipe`, suggestion: `Add ${carrier} for its ${name}` });
      }
      continue;
    }
    const condition = CONDITIONS[m.condition ?? ""];
    if (!condition) throw new Error(`modifier on ${m.targetCompoundSlug} names a condition the engine cannot test: "${m.condition}"`);
    const t = totals.find((x) => x.compoundSlug === condition.compoundSlug);
    const grams = t?.amount == null ? 0 : convert(t.amount, t.unit!, "g");
    const threshold = condition.threshold(settings);
    const met = grams >= threshold;
    const amountText = `${formatAmount(grams)} g of ${condition.noun} per serving`;
    const unmeasured = ingredientSlugs.filter((s) => !t?.contributors.some((c) => c.ingredientSlug === s && c.amount !== null));
    if (!met && unmeasured.length > 0) {
      add({ ...base, status: "unknown", reason: `${amountText}, but no ${condition.noun} amount for ${unmeasured.join(", ")}` });
    } else if (met) {
      add({
        ...base,
        status: m.direction === "enhances" ? "enhanced" : "reduced",
        reason: `${amountText}, at or above the ${formatAmount(threshold)} g that counts as enough`,
      });
    } else if (m.direction === "enhances") {
      add({
        ...base,
        status: "missed",
        reason: `${amountText}, under the ${formatAmount(threshold)} g that counts as enough`,
        suggestion: condition.suggestion,
      });
    }
  }
  return [...byClaim.values()];
}
