// npm run generate:foods — pins every food in USDA's SR Legacy as a Dex food in data/seed/usda-foods.json,
// and draws the stand-in creature for each category into public/art/stand-ins. A food's name comes from
// USDA's description, since the words after the first comma are what make each form its own thing.
// It wears a drawing when its creature in the list has one, or else its category's stand-in.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { foodStandIn } from "../lib/art/creature.ts";
import { listFoodIds, pullFoods } from "../lib/usda/client.ts";
import { FOOD_CATEGORIES, foodCategory, foodName, foodSlug, USDA_CACHE, USDA_FOOD_PINS } from "../lib/usda/foods.ts";

type Creature = { key: string; fdcIds: number[] };

const apiKey = process.env.USDA_API_KEY;
if (!apiKey) throw new Error("USDA_API_KEY is not set in .env.local");

const records = await pullFoods(await listFoodIds("SR Legacy", apiKey), apiKey, USDA_CACHE);
const creatures = JSON.parse(readFileSync("tools/art/creatures-sr-legacy.json", "utf8")) as Creature[];

mkdirSync("public/art/stand-ins", { recursive: true });
for (const category of FOOD_CATEGORIES) writeFileSync(`public/art/stand-ins/${foodSlug(category)}.svg`, foodStandIn(category));

/** @return [string | undefined] the drawing for a creature, whose file may be named in the singular */
function drawingOf(key: string): string | undefined {
  const names = [key, key.replace(/ies$/, "y"), key.replace(/ves$/, "f"), key.replace(/es$/, ""), key.replace(/s$/, "")];
  const name = names.find((n) => existsSync(`public/art/ingredients/${n}.svg`));
  return name && `/art/ingredients/${name}.svg`;
}

const drawing = new Map(creatures.flatMap((c) => c.fdcIds.map((id) => [id, drawingOf(c.key)] as const)));

const names = new Set(INGREDIENTS.map((i) => i.name));
const slugs = new Set(INGREDIENTS.map((i) => i.slug));
const handPinned = new Set(INGREDIENTS.map((i) => i.usdaFdcId));
const pins = [...records.values()]
  .filter((food) => !handPinned.has(food.fdcId))
  .sort((a, b) => a.fdcId - b.fdcId)
  .map((food) => {
    const category = foodCategory(food.foodCategory!.description);
    const name = foodName(food.description);
    if (names.has(name)) throw new Error(`two foods would be "${name}"; the second is fdcId ${food.fdcId}`);
    names.add(name);
    // USDA spells a few foods two ways ("whole-wheat", "whole wheat"), and those slug alike.
    const slug = slugs.has(foodSlug(name)) ? `${foodSlug(name)}-${food.fdcId}` : foodSlug(name);
    slugs.add(slug);
    return {
      slug,
      name,
      category,
      usdaFdcId: food.fdcId,
      usdaDescription: food.description,
      imageUrl: drawing.get(food.fdcId) ?? `/art/stand-ins/${foodSlug(category)}.svg`,
    };
  });

writeFileSync(USDA_FOOD_PINS, `[\n${pins.map((p) => JSON.stringify(p)).join(",\n")}\n]\n`);
const drawn = pins.filter((p) => p.imageUrl.startsWith("/art/ingredients/")).length;
console.log(`pinned ${pins.length} foods beside the ${INGREDIENTS.length} pinned by hand: ${drawn} wear a drawing, ${pins.length - drawn} a stand-in`);
