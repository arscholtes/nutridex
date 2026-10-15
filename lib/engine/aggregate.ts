// Step 3: total each compound across the recipe, per serving, keeping where each part came from.
import { convert } from "./units.ts";
import type { CompoundTotal, Contribution, RecipeInput } from "./types.ts";

/**
 * Sum contributions per compound and divide by servings.
 * A compound's total is in its first measured contributor's unit; contributors with no measured
 * amount are named in `missingFrom` and left out of the sum.
 * @param recipe [RecipeInput] the recipe, for its servings
 * @param contributions [Contribution[]] contributions after prep
 * @return [CompoundTotal[]] one per compound, in first-seen order
 */
export function aggregate(recipe: RecipeInput, contributions: Contribution[]): CompoundTotal[] {
  const byCompound = Map.groupBy(contributions, (c) => c.compoundSlug);
  return [...byCompound].map(([compoundSlug, parts]) => {
    const unit = parts.find((p) => p.unit !== null)?.unit ?? null;
    const perServing = (n: number, from: Contribution) => convert(n, from.unit!, unit!) / recipe.servings;
    const measured = parts.filter((p) => p.amount !== null);
    const allRanged = measured.length > 0 && parts.every((p) => p.range !== null);
    return {
      compoundSlug,
      amount: measured.length === 0 ? null : measured.reduce((sum, p) => sum + perServing(p.amount!, p), 0),
      unit,
      range: allRanged
        ? [
            parts.reduce((sum, p) => sum + perServing(p.range![0], p), 0),
            parts.reduce((sum, p) => sum + perServing(p.range![1], p), 0),
          ]
        : null,
      contributors: parts.map((p) => ({ ingredientSlug: p.ingredientSlug, amount: p.amount === null ? null : perServing(p.amount, p) })),
      missingFrom: parts.filter((p) => p.amount === null).map((p) => p.ingredientSlug),
    };
  });
}
