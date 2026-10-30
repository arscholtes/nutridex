// A creature for a compound, drawn from its data until it has drawn art: its class sets the colour
// and body shape, and its place among its class in the seed sets where its two atoms sit and how
// big they are, so no two seeded compounds look the same (up to 21 per class).
// The tile, outline and face follow tools/art/STYLE.md, the house style of the drawn ingredients.
import { COMPOUNDS } from "../../data/seed/compounds.ts";
import { isDark, tint, typeColor } from "./palette.ts";

type Shape = "round" | "tall" | "hex" | "drop" | "gem" | "block";

const SHAPE_OF: Record<string, Shape> = {
  carotenoid: "tall",
  vitamin: "round",
  fiber: "block",
  polyphenol: "hex",
  alkaloid: "hex",
  betalain: "round",
  nitrate: "gem",
  antinutrient: "gem",
  macronutrient: "drop",
  energy: "drop",
  mineral: "gem",
  nutrient: "round",
};

const BODIES: Record<Shape, (fill: string) => string> = {
  round: (f) => `<circle cx="128" cy="138" r="72" fill="${f}"/>`,
  tall: (f) => `<ellipse cx="128" cy="136" rx="60" ry="78" fill="${f}"/>`,
  hex: (f) => `<path d="M128 60 L196 99 L196 177 L128 216 L60 177 L60 99 Z" fill="${f}"/>`,
  drop: (f) => `<path d="M128 58 C150 92 196 126 196 160 C196 198 164 216 128 216 C92 216 60 198 60 160 C60 126 106 92 128 58 Z" fill="${f}"/>`,
  gem: (f) => `<path d="M128 62 L196 122 L164 212 L92 212 L60 122 Z" fill="${f}"/>`,
  block: (f) => `<rect x="62" y="68" width="132" height="146" rx="44" fill="${f}"/>`,
};

// Atom pairs, each atom at a corner clear of the face, with its bond pointing in toward the body.
const ATOMS: [number, number, number, number][][] = [
  [[52, 56, 74, 78], [204, 56, 182, 78]],
  [[48, 96, 70, 106], [208, 196, 188, 184]],
  [[208, 96, 186, 106], [48, 196, 68, 184]],
  [[128, 34, 128, 58], [208, 150, 194, 150]],
  [[128, 34, 128, 58], [48, 150, 62, 150]],
  [[52, 56, 74, 78], [208, 196, 188, 184]],
  [[204, 56, 182, 78], [48, 196, 68, 184]],
];

const ATOM_RADII = [13, 11, 15];

/**
 * @param compound [{ slug, name, class }] the compound to draw
 * @return [string] a 256 x 256 SVG
 */
export function compoundCreature(compound: { slug: string; name: string; class: string | null }): string {
  const body = typeColor(compound.class);
  const dark = isDark(body);
  const look = variant(compound);
  const radius = ATOM_RADII[Math.floor(look / ATOMS.length) % ATOM_RADII.length];
  const atoms = ATOMS[look % ATOMS.length]
    .map(([x, y, bx, by]) => `<path d="M${x} ${y} L${bx} ${by}"/><circle cx="${x}" cy="${y}" r="${radius}" fill="${tint(body, 0.25)}"/>`)
    .join("");
  const smile = dark ? "#FFFFFF" : "#1B1B1F";
  const blush = dark ? `fill="#FF9EC4" opacity="0.55"` : `fill="#FF5F6D" opacity="0.45"`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="t">`,
    `<title id="t">${escapeXml(compound.name)}</title>`,
    `<rect x="8" y="8" width="240" height="240" rx="40" fill="${tint(body, 0.85)}"/>`,
    `<ellipse cx="128" cy="224" rx="56" ry="9" fill="#000" opacity="0.14"/>`,
    `<g stroke="#1B1B1F" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">${BODIES[SHAPE_OF[compound.class ?? ""] ?? "round"](body)}${atoms}</g>`,
    `<ellipse cx="100" cy="98" rx="15" ry="9" fill="${tint(body, 0.45)}"/>`,
    `<ellipse cx="103" cy="143" rx="8" ry="4.5" ${blush}/><ellipse cx="153" cy="143" rx="8" ry="4.5" ${blush}/>`,
    `<g stroke="#1B1B1F" stroke-width="3.5"><ellipse cx="113" cy="124" rx="9.5" ry="11" fill="#FFFFFF"/><ellipse cx="143" cy="124" rx="9.5" ry="11" fill="#FFFFFF"/></g>`,
    `<circle cx="115" cy="126" r="5.2" fill="#1B1B1F"/><circle cx="145" cy="126" r="5.2" fill="#1B1B1F"/>`,
    `<circle cx="117" cy="123" r="1.9" fill="#FFFFFF"/><circle cx="147" cy="123" r="1.9" fill="#FFFFFF"/>`,
    `<path d="M120 143 Q128 151 136 143" stroke="${smile}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
    `</svg>`,
  ].join("\n");
}

/** @return [string] the SVG as a data URL an <img> can show */
export function creatureDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// A seeded compound's place among its class, so each gets its own look; a hash for any other.
function variant(compound: { slug: string; class: string | null }): number {
  const place = COMPOUNDS.filter((c) => c.class === compound.class).findIndex((c) => c.slug === compound.slug);
  return place >= 0 ? place : hash(compound.slug);
}

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
