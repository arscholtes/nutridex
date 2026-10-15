// Stacks: recipes and supplements taken together, totalled and checked against upper limits.
import { convert } from "./units.ts";
import type { AmountOf, ExcessCheck, StackItemInput, StackTotal, UpperLimitFact } from "./types.ts";

/**
 * Total every compound across a stack: a recipe adds its per-serving totals × servings, a
 * supplement its amount per serving × servings. Each total is in its first measured unit.
 * @param items [StackItemInput[]] the stack's recipes and supplements
 * @return [StackTotal[]] one per compound, in first-seen order
 */
export function stackTotals(items: StackItemInput[]): StackTotal[] {
  const parts = items.flatMap((item) => {
    const rows = item.kind === "recipe" ? item.perServing.map((t) => ({ compoundSlug: t.compoundSlug, amount: t.amount, unit: t.unit })) : item.compounds.map((c) => ({ compoundSlug: c.compoundSlug, amount: c.amountPerServing, unit: c.unit }));
    return rows.map((r) => ({ ...r, itemSlug: item.slug, amount: r.amount === null ? null : r.amount * item.servings }));
  });
  return [...Map.groupBy(parts, (p) => p.compoundSlug)].map(([compoundSlug, rows]) => {
    const unit = rows.find((r) => r.unit !== null)?.unit ?? null;
    const inUnit = (r: (typeof rows)[number]) => (r.amount === null ? null : convert(r.amount, r.unit!, unit!));
    const measured = rows.filter((r) => r.amount !== null);
    return {
      compoundSlug,
      amount: measured.length === 0 ? null : measured.reduce((sum, r) => sum + inUnit(r)!, 0),
      unit,
      contributors: rows.map((r) => ({ itemSlug: r.itemSlug, amount: inUnit(r) })),
      missingFrom: rows.filter((r) => r.amount === null).map((r) => r.itemSlug),
    };
  });
}

/**
 * Compare each measured total with its compound's upper limit.
 * @param totals [AmountOf[]] totals to check
 * @param upperLimits [UpperLimitFact[]] sourced upper limits
 * @return [ExcessCheck[]] one per measured total; "no upper limit on file" where none is sourced
 */
export function checkExcess(totals: AmountOf[], upperLimits: UpperLimitFact[]): ExcessCheck[] {
  return totals
    .filter((t) => t.amount !== null)
    .map((t) => {
      const limit = upperLimits.find((l) => l.compoundSlug === t.compoundSlug);
      const base = { compoundSlug: t.compoundSlug, amount: t.amount!, unit: t.unit! };
      if (!limit) return { ...base, upperLimit: null, status: "no upper limit on file" as const };
      const over = convert(t.amount!, t.unit!, limit.unit) > limit.amount;
      return { ...base, upperLimit: { amount: limit.amount, unit: limit.unit }, status: over ? ("over" as const) : ("within" as const) };
    });
}
