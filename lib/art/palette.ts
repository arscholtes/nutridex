// Type colours: a compound class, ingredient category or body system has one colour everywhere,
// on its badge and on its creature. A type with none listed is grey.

const TYPE_COLORS: Record<string, string> = {
  // Compound classes
  carotenoid: "#FF8A2A",
  vitamin: "#FFD23F",
  fiber: "#8BC34A",
  polyphenol: "#F2B705",
  alkaloid: "#6D4C41",
  betalain: "#C2185B",
  nitrate: "#4FC3F7",
  antinutrient: "#9E9E9E",
  macronutrient: "#FFE082",
  // Ingredient categories
  vegetable: "#43B05C",
  fruit: "#FF5F6D",
  spice: "#D68A3A",
  oil: "#E0C341",
  egg: "#B0BEC5",
  // Body systems
  skin: "#F4A261",
};

const UNTYPED = "#90A4AE";

/** @return [string] the type's colour, as #RRGGBB */
export function typeColor(type: string | null): string {
  return (type && TYPE_COLORS[type]) || UNTYPED;
}

/**
 * Mix a colour toward white.
 * @param hex [string] #RRGGBB
 * @param amount [number] 0 keeps the colour, 1 is white
 * @return [string] #RRGGBB
 */
export function tint(hex: string, amount: number): string {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}

/** @return [boolean] true when white reads better than near-black on this colour */
export function isDark(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}
