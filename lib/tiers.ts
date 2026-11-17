// Research tiers and trainer ranks: the thresholds, and the rules that read them. Pure, so the server, the web
// and the tests agree. A tier decides which sections of an entry draw; it never changes a figure or a claim.

/** What someone has done with one food. */
export type FoodHistory = {
  /** Times they have had it. */
  catches: number;
  /** Different forms they have had it in: raw, juiced, cooked. */
  forms: number;
  /** Times they had it as part of a recipe. */
  cooked: number;
  /** Different recipes they have had it in. */
  recipes: number;
  /** Different sources of its claims they have opened. */
  sourcesOpened: number;
};

export type Task = keyof FoodHistory;

type Tier = { stars: number; name: string; needs: "all" | "any"; tasks: { task: Task; count: number }[] };

/** Each tier also needs the one before it. */
export const TIERS: Tier[] = [
  { stars: 1, name: "Tasted", needs: "all", tasks: [{ task: "catches", count: 1 }] },
  { stars: 2, name: "Familiar", needs: "any", tasks: [{ task: "catches", count: 3 }, { task: "cooked", count: 1 }] },
  { stars: 3, name: "Studied", needs: "all", tasks: [{ task: "sourcesOpened", count: 2 }, { task: "forms", count: 2 }] },
  { stars: 4, name: "Mastered", needs: "all", tasks: [{ task: "catches", count: 10 }, { task: "recipes", count: 3 }] },
];

const met = (tier: Tier, history: FoodHistory): boolean => {
  const done = tier.tasks.map((t) => history[t.task] >= t.count);
  return tier.needs === "all" ? done.every(Boolean) : done.some(Boolean);
};

/**
 * @param history [FoodHistory] what someone has done with a food
 * @return [number] its stars, 0 to 4; 0 is not caught
 */
export function tierOf(history: FoodHistory): number {
  const firstUnmet = TIERS.findIndex((tier) => !met(tier, history));
  return firstUnmet === -1 ? TIERS.length : firstUnmet;
}

export type TierProgress = { tier: number; next: { stars: number; name: string; tasks: { task: Task; have: number; need: number }[] } | null };

/**
 * @param history [FoodHistory] what someone has done with a food
 * @return [TierProgress] its stars, and each task of the next tier with how far along it is
 */
export function tierProgress(history: FoodHistory): TierProgress {
  const tier = tierOf(history);
  const next = TIERS[tier];
  if (!next) return { tier, next: null };
  return { tier, next: { stars: next.stars, name: next.name, tasks: next.tasks.map((t) => ({ task: t.task, have: Math.min(history[t.task], t.count), need: t.count })) } };
}

type Rank = { name: string; caught: number; badges: number };

/** Lowest first. The design names a fifth rank, Professor, with no threshold yet, so it is not here. */
export const RANKS: Rank[] = [
  { name: "Kitchen hand", caught: 1, badges: 0 },
  { name: "Line cook", caught: 10, badges: 0 },
  { name: "Sous chef", caught: 25, badges: 3 },
  { name: "Head chef", caught: 50, badges: 6 },
];

/**
 * @param trainer [{ caught: number; badges: number }] different foods caught, and badges earned
 * @return [Rank | null] the highest rank whose count and badges are both met; null before the first catch
 */
export function rankOf(trainer: { caught: number; badges: number }): Rank | null {
  return RANKS.findLast((r) => trainer.caught >= r.caught && trainer.badges >= r.badges) ?? null;
}
