// Tunable settings: choices about how to weigh and judge facts, not facts themselves.
import type { Grade, MassUnit } from "./types.ts";

export type EngineSettings = {
  /** Weight of a claim in a goal score, by its evidence grade. */
  gradeWeights: Record<Grade, number>;
  /** Grams of fat per serving that count as "dietary fat present". */
  fatThresholdG: number;
  /** Per compound, the amount a goal score counts as 1. A compound without one is left unscored. */
  referenceAmounts: Record<string, { amount: number; unit: MassUnit }>;
};
