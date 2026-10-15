// Mass units are exact multiples of each other, so the engine converts freely between them.
import type { MassUnit } from "./types.ts";

const MICROGRAMS: Record<MassUnit, number> = { g: 1_000_000, mg: 1_000, "µg": 1 };

/**
 * Convert a mass from one unit to another.
 * @param amount [number] the mass in `from`
 * @param from [MassUnit] its unit
 * @param to [MassUnit] the unit wanted
 * @return [number] the same mass in `to`
 */
export function convert(amount: number, from: MassUnit, to: MassUnit): number {
  return from === to ? amount : (amount * MICROGRAMS[from]) / MICROGRAMS[to];
}

/**
 * A mass rounded to three significant figures for a reason or summary.
 * @param amount [number] the mass
 * @return [string] e.g. "0.6", "14", "2500"
 */
export function formatAmount(amount: number): string {
  return String(Number(amount.toPrecision(3)));
}
