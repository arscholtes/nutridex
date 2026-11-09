// npm run seed:foods — adds every pinned USDA food to a database `npm run seed` has filled, with its
// amounts per 100 g exactly as USDA reports them and a source row naming its USDA record. Safe to
// re-run. Every record is read before anything is written, so a network failure leaves the database
// untouched. It writes in chunks, because a row at a time takes hours against a database over a network.
import { readFileSync } from "node:fs";
import { inArray, sql as raw } from "drizzle-orm";
import { db, sql } from "../lib/db/client.ts";
import { compound, ingredient, ingredientCompound, source } from "../lib/db/schema.ts";
import { pullFoods, usdaSource } from "../lib/usda/client.ts";
import { USDA_CACHE, USDA_FOOD_PINS, type UsdaFoodPin } from "../lib/usda/foods.ts";
import { compoundAmounts } from "../lib/usda/nutrients.ts";
import { retentionFamilyOf } from "../lib/usda/retention.ts";
import { seedPortions } from "./seed/portions.ts";

const CHUNK = 1_000;

const apiKey = process.env.USDA_API_KEY;
if (!apiKey) throw new Error("USDA_API_KEY is not set in .env.local");

const pins = JSON.parse(readFileSync(USDA_FOOD_PINS, "utf8")) as UsdaFoodPin[];
const records = await pullFoods(pins.map((p) => p.usdaFdcId), apiKey, USDA_CACHE);
for (const pin of pins) {
  const food = records.get(pin.usdaFdcId)!;
  if (food.description !== pin.usdaDescription) {
    throw new Error(`fdcId ${pin.usdaFdcId} is now "${food.description}", not "${pin.usdaDescription}"; re-check which USDA food stands for ${pin.slug}`);
  }
}

function chunks<T>(rows: T[]): T[][] {
  return Array.from({ length: Math.ceil(rows.length / CHUNK) }, (_, i) => rows.slice(i * CHUNK, (i + 1) * CHUNK));
}

let amounts = 0;
let portions = 0;
await db.transaction(async (tx) => {
  const compounds = new Map((await tx.select({ id: compound.id, slug: compound.slug }).from(compound)).map((c) => [c.slug, c.id]));

  const foodIds = new Map<string, string>();
  for (const rows of chunks(pins)) {
    const written = await tx
      .insert(ingredient)
      .values(
        rows.map((p) => {
          const fat = compoundAmounts(records.get(p.usdaFdcId)!).find((a) => a.compoundSlug === "total-fat")?.amountPer100g ?? null;
          return {
            slug: p.slug,
            name: p.name,
            category: p.category,
            usdaFdcId: p.usdaFdcId,
            imageUrl: p.imageUrl,
            retentionFamily: retentionFamilyOf(p.category, p.usdaDescription, { fatPer100g: fat }),
          };
        }),
      )
      .onConflictDoUpdate({
        target: ingredient.slug,
        set: {
          name: raw`excluded.name`,
          category: raw`excluded.category`,
          usdaFdcId: raw`excluded.usda_fdc_id`,
          imageUrl: raw`excluded.image_url`,
          retentionFamily: raw`excluded.retention_family`,
        },
      })
      .returning({ id: ingredient.id, slug: ingredient.slug });
    for (const row of written) foodIds.set(row.slug, row.id);
  }

  const sources = pins.map((p) => usdaSource(records.get(p.usdaFdcId)!));
  const sourceIds = new Map<string, string>();
  for (const rows of chunks(sources)) {
    const existing = await tx.select({ id: source.id, url: source.url }).from(source).where(inArray(source.url, rows.map((s) => s.url)));
    for (const row of existing) sourceIds.set(row.url!, row.id);
    const fresh = rows.filter((s) => !sourceIds.has(s.url));
    if (fresh.length === 0) continue;
    for (const row of await tx.insert(source).values(fresh).returning({ id: source.id, url: source.url })) sourceIds.set(row.url!, row.id);
  }

  const rows = pins.flatMap((pin) => {
    const food = records.get(pin.usdaFdcId)!;
    const sourceId = sourceIds.get(usdaSource(food).url)!;
    return compoundAmounts(food).map((a) => {
      const compoundId = compounds.get(a.compoundSlug);
      if (!compoundId) throw new Error(`compound ${a.compoundSlug} is not in the database; run npm run seed first`);
      return { ingredientId: foodIds.get(pin.slug)!, compoundId, amountPer100g: a.amountPer100g, unit: a.unit, sourceId };
    });
  });
  amounts = rows.length;
  portions = await seedPortions(tx, pins.map((p) => ({ ingredientId: foodIds.get(p.slug)!, usdaFdcId: p.usdaFdcId })));
  for (const chunk of chunks(rows)) {
    await tx
      .insert(ingredientCompound)
      .values(chunk)
      .onConflictDoUpdate({
        target: [ingredientCompound.ingredientId, ingredientCompound.compoundId],
        set: { amountPer100g: raw`excluded.amount_per_100g`, unit: raw`excluded.unit`, sourceId: raw`excluded.source_id` },
      });
  }
});

console.log(`seeded ${pins.length} USDA foods with ${amounts} amounts per 100 g and ${portions} household measures`);
await sql.end();
