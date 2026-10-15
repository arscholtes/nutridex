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

export const DEFAULT_SETTINGS: EngineSettings = {
  gradeWeights: { A: 1, B: 0.6, C: 0.25, D: 0.1 },
  // The smallest fat dose shown to beat a fat-free vegetable meal for carotenoid absorption
  // (Brown et al. 2004, 6 g against 0 g). It means fat is present, not that absorption is at its
  // best: it kept rising up to 32 g (White et al. 2017), and lutein esters did better with 36 g
  // than 3 g (Roodenburg et al. 2000).
  fatThresholdG: 6,
  referenceAmounts: {},
};
