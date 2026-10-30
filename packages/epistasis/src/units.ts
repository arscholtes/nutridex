// Mass units are exact multiples of each other, so the engine converts freely between them.
// Energy (kcal) is not a mass: it converts to nothing but itself.
import type { MassUnit, Unit } from "./types.ts";

const MICROGRAMS: Record<MassUnit, number> = { g: 1_000_000, mg: 1_000, "µg": 1 };

/**
 * Convert an amount from one unit to another.
 * @param amount [number] the amount in `from`
 * @param from [Unit] its unit
 * @param to [Unit] the unit wanted
 * @return [number] the same amount in `to`
 * @throws when one unit is energy and the other a mass
 */
export function convert(amount: number, from: Unit, to: Unit): number {
  if (from === to) return amount;
  if (from === "kcal" || to === "kcal") throw new Error(`can't convert ${from} to ${to}: energy is not a mass`);
  return (amount * MICROGRAMS[from]) / MICROGRAMS[to];
}

/**
 * A mass rounded to three significant figures for a reason or summary.
 * @param amount [number] the mass
 * @return [string] e.g. "0.6", "14", "2500"
 */
export function formatAmount(amount: number): string {
  return String(Number(amount.toPrecision(3)));
}
