// npm run creatures:map — says, for every creature drawing, which USDA foods wear it, and why the rest
// cannot. Pure: reads the drawings, the USDA creature list, the hand-pinned foods and the food pins, and
// writes docs/creature-mapping.md plus tools/art/creature-foods.json. With --apply it also points each
// newly matched food's pin at its drawing, so `npm run seed:foods` dresses it; nothing else changes.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { USDA_FOOD_PINS, type UsdaFoodPin } from "../lib/usda/foods.ts";

type Creature = { key: string; fdcIds: number[] };
type Mapped = { key: string; how: "creature list" | "hand-pinned" | "name"; fdcIds: number[] };
type Mapping = Mapped | { key: string; how: "none"; reason: string };

const ART = "public/art/ingredients";
const CREATURES = "tools/art/creatures-sr-legacy.json";
const OUT_JSON = "tools/art/creature-foods.json";
const OUT_DOC = "docs/creature-mapping.md";

const drawings = readdirSync(ART).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)).sort();
const creatures = JSON.parse(readFileSync(CREATURES, "utf8")) as Creature[];
const pins = JSON.parse(readFileSync(USDA_FOOD_PINS, "utf8")) as UsdaFoodPin[];
const pinned = new Set([...pins.map((p) => p.usdaFdcId), ...INGREDIENTS.map((i) => i.usdaFdcId)]);
const handPinned = new Map(INGREDIENTS.map((i) => [i.slug, i.usdaFdcId]));

/** The spellings a drawing's file may use for a creature key: the generator accepts a singular too. */
function variants(key: string): string[] {
  return [key, key.replace(/ies$/, "y"), key.replace(/ves$/, "f"), key.replace(/es$/, ""), key.replace(/s$/, "")];
}

const byVariant = new Map<string, Creature>();
for (const c of creatures) for (const v of variants(c.key)) if (!byVariant.has(v)) byVariant.set(v, c);

const singular = (w: string) => w.replace(/ies$/, "y").replace(/ves$/, "f").replace(/(ch|sh|x|s)es$/, "$1").replace(/s$/, "");
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).map(singular);
const plain = (description: string) => description.replace(/[()]/g, " ").toLowerCase();
const segments = (description: string) => plain(description).split(",").map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
/** What USDA adds after a food's own name inside a segment: "cashew nuts", "coriander (cilantro) leaves". */
const TRAILING = new Set(["nut", "bean", "seed", "leaf", "leave", "root", "pea", "grain"]);
const segmentNames = (seg: string, word: string) => {
  const w = words(seg).filter((x) => !TRAILING.has(x));
  return w.length === 1 && w[0] === word;
};

/** Categories whose descriptions are dishes, snacks and brands made from a food, never the food a creature draws. */
const NOT_A_FOOD = new Set(["restaurant", "fast food", "baby food", "meal", "snack", "baked", "soup"]);

/** Where USDA's name for a food shares no word with the drawing's: the phrase its description carries. */
const USDA_CALLS_IT: Record<string, string> = {
  "baking-powder": "leavening agents, baking powder",
  "baking-soda": "leavening agents, baking soda",
  "bell-pepper": "peppers, sweet",
  yeast: "leavening agents, yeast",
  "bitter-melon": "balsam-pear",
  "black-eyed-peas": "cowpeas",
  "brazil-nut": "brazilnuts",
  "collard-greens": "collards",
  "cornish-hen": "cornish game hens",
  flounder: "flatfish",
  jicama: "yambean",
  "monterey-jack": "cheese, monterey",
  chickpeas: "chickpeas",
  "ground-cherry": "groundcherries",
  "hickory-nut": "hickorynuts",
  kamut: "khorasan",
  lemongrass: "lemon grass",
  "lupini-beans": "lupins",
  lychee: "litchis",
  "mahi-mahi": "mahimahi",
  "pili-nut": "pilinuts",
  pomelo: "pummelo",
  scallion: "scallions",
  "soy-milk": "soymilk",
  "water-chestnut": "waterchestnuts",
  "yellow-squash": "squash, summer, crookneck",
};

/**
 * Foods whose USDA description names the drawing. A one-word name must be a whole comma segment of the
 * description ("Beef, chuck, …" and "Cheese, brie" both qualify; "Bread, egg" does not wear the egg). A
 * longer name needs every one of its words somewhere in the description ("Egg, duck, whole" wears the duck
 * egg). Dishes and brands are never a match. Where USDA's own name shares no word, USDA_CALLS_IT says it.
 * @param key [string] the drawing's file name
 * @return [number[]] matching fdcIds, in pin order
 */
function foodsNamed(key: string): number[] {
  const alias = USDA_CALLS_IT[key];
  const name = key.replace(/-/g, " ");
  const want = words(name);
  const foods = pins.filter((p) => !NOT_A_FOOD.has(p.category));
  const named = alias
    ? pins.filter((p) => plain(p.usdaDescription).includes(alias))
    : want.length === 1
      ? foods.filter((p) => {
          const description = p.usdaDescription.toLowerCase();
          const inParens = [...description.matchAll(/\(([^)]*)\)/g)].some((m) => words(m[1]).join(" ") === want[0]);
          return inParens || segments(p.usdaDescription).some((seg) => segmentNames(seg, want[0]));
        })
      : foods.filter((p) => {
          const have = new Set(words(p.usdaDescription));
          return want.every((w) => have.has(w));
        });
  return named.map((p) => p.usdaFdcId);
}

/** The three USDA foods whose descriptions share the most words with the drawing's name, for the reason line. */
function nearest(key: string): string[] {
  const want = new Set(words(key.replace(/-/g, " ")));
  return pins
    .map((p) => ({ p, score: words(p.usdaDescription).filter((w) => want.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.usdaDescription.length - b.p.usdaDescription.length)
    .slice(0, 3)
    .map((x) => `${x.p.usdaDescription} (${x.p.usdaFdcId})`);
}

const mappings: Mapping[] = drawings.map((key) => {
  const creature = byVariant.get(key);
  if (creature) return { key, how: "creature list", fdcIds: creature.fdcIds.filter((id) => pinned.has(id)) };
  if (handPinned.has(key)) return { key, how: "hand-pinned", fdcIds: [handPinned.get(key)!] };
  const named = foodsNamed(key);
  if (named.length > 0) return { key, how: "name", fdcIds: named };
  const near = nearest(key);
  const reason = near.length > 0 ? `no USDA SR Legacy food is named this; nearest: ${near.join("; ")}` : "no USDA SR Legacy food shares a word with this name";
  return { key, how: "none", reason };
});

const byName = mappings.filter((m): m is Mapped => m.how === "name");
writeFileSync(OUT_JSON, `${JSON.stringify(Object.fromEntries(byName.map((m) => [m.key, m.fdcIds])), null, 1)}\n`);

const counts = {
  list: mappings.filter((m) => m.how === "creature list").length,
  hand: mappings.filter((m) => m.how === "hand-pinned").length,
  name: byName.length,
  none: mappings.filter((m) => m.how === "none").length,
};
const lines = [
  "# Which USDA foods wear each creature",
  "",
  `Generated by \`npm run creatures:map\` from the ${drawings.length} drawings in \`${ART}\`, the USDA creature list, the hand-pinned foods and the food pins. Every drawing is listed: ${counts.list} map through the USDA creature list, ${counts.hand} are hand-pinned foods, ${counts.name} are matched by name to a USDA description, and ${counts.none} have no USDA SR Legacy food and say why.`,
  "",
  "| Drawing | How | USDA foods |",
  "| --- | --- | --- |",
  ...mappings.map((m) => (m.how === "none" ? `| ${m.key} | none | ${m.reason} |` : `| ${m.key} | ${m.how} | ${m.fdcIds.length}: ${m.fdcIds.slice(0, 6).join(", ")}${m.fdcIds.length > 6 ? ", …" : ""} |`)),
  "",
];
writeFileSync(OUT_DOC, lines.join("\n"));
console.log(`${drawings.length} drawings: ${counts.list} via the creature list, ${counts.hand} hand-pinned, ${counts.name} by name, ${counts.none} with no USDA food`);

if (process.argv.includes("--apply")) {
  const wear = new Map(byName.flatMap((m) => m.fdcIds.map((id) => [id, `/art/ingredients/${m.key}.svg`] as const)));
  let dressed = 0;
  for (const p of pins) {
    const drawing = wear.get(p.usdaFdcId);
    if (drawing && !p.imageUrl.startsWith("/art/ingredients/")) {
      p.imageUrl = drawing;
      dressed += 1;
    }
  }
  if (!existsSync(USDA_FOOD_PINS)) throw new Error(`${USDA_FOOD_PINS} is missing`);
  writeFileSync(USDA_FOOD_PINS, `[\n${pins.map((p) => JSON.stringify(p)).join(",\n")}\n]\n`);
  console.log(`dressed ${dressed} foods that wore a stand-in in their drawing`);
}
