// npm run seed — fills the database with the plan's seed ingredients and compounds, and imports
// their amounts per 100 g from USDA FoodData Central. Safe to re-run: every write is an upsert.
//
// All USDA records are fetched before anything is written, so a network failure leaves the
// database untouched. Amounts are stored exactly as USDA reports them, each with a source row
// naming the USDA record; a compound USDA does not measure keeps a null amount.
import { eq, isNull } from "drizzle-orm";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { db, sql } from "../lib/db/client.ts";
import { compound, ingredient, ingredientCompound, source } from "../lib/db/schema.ts";
import { fetchFood, foodUrl } from "../lib/usda/client.ts";
import { compoundAmounts, type FdcFood } from "../lib/usda/nutrients.ts";

const apiKey = process.env.USDA_API_KEY;
if (!apiKey) throw new Error("USDA_API_KEY is not set in .env.local");

const foods = new Map<string, FdcFood>();
for (const seed of INGREDIENTS) {
  const food = await fetchFood(seed.usdaFdcId, apiKey);
  if (food.description !== seed.usdaDescription) {
    throw new Error(
      `fdcId ${seed.usdaFdcId} is now "${food.description}", not "${seed.usdaDescription}"; ` +
        `re-check which USDA food stands for ${seed.slug}`,
    );
  }
  foods.set(seed.slug, food);
}

const missing: string[] = [];
await db.transaction(async (tx) => {
  const compoundIds = new Map<string, string>();
  for (const c of COMPOUNDS) {
    const [row] = await tx
      .insert(compound)
      .values({ slug: c.slug, name: c.name, class: c.class })
      .onConflictDoUpdate({ target: compound.slug, set: { name: c.name, class: c.class } })
      .returning({ id: compound.id });
    compoundIds.set(c.slug, row.id);
  }

  const ingredientIds = new Map<string, string>();
  for (const seed of INGREDIENTS) {
    const values = {
      name: seed.name,
      category: seed.category,
      usdaFdcId: seed.usdaFdcId,
      imageUrl: `/art/ingredients/${seed.slug}.svg`,
    };
    const [row] = await tx
      .insert(ingredient)
      .values({ slug: seed.slug, ...values })
      .onConflictDoUpdate({ target: ingredient.slug, set: values })
      .returning({ id: ingredient.id });
    ingredientIds.set(seed.slug, row.id);
  }

  for (const seed of INGREDIENTS) {
    const food = foods.get(seed.slug)!;
    const url = foodUrl(food.fdcId);
    const sourceValues = {
      title: `USDA FoodData Central: ${food.description} (${food.dataType}, fdcId ${food.fdcId})`,
      url,
      studyType: "database",
      year: publicationYear(food),
    };
    const [existing] = await tx.select({ id: source.id }).from(source).where(eq(source.url, url));
    const sourceId = existing
      ? (await tx.update(source).set(sourceValues).where(eq(source.id, existing.id)).returning({ id: source.id }))[0].id
      : (await tx.insert(source).values(sourceValues).returning({ id: source.id }))[0].id;

    for (const a of compoundAmounts(food)) {
      const values = { amountPer100g: a.amountPer100g, unit: a.unit, sourceId };
      await tx
        .insert(ingredientCompound)
        .values({ ingredientId: ingredientIds.get(seed.slug)!, compoundId: compoundIds.get(a.compoundSlug)!, ...values })
        .onConflictDoUpdate({ target: [ingredientCompound.ingredientId, ingredientCompound.compoundId], set: values });
    }
  }

  // The plan's main seed pairs that USDA did not fill still link ingredient to compound.
  for (const c of COMPOUNDS) {
    for (const slug of c.mainIngredients) {
      await tx
        .insert(ingredientCompound)
        .values({ ingredientId: ingredientIds.get(slug)!, compoundId: compoundIds.get(c.slug)! })
        .onConflictDoNothing();
    }
  }

  const unfilled = await tx
    .select({ ingredient: ingredient.slug, compound: compound.slug })
    .from(ingredientCompound)
    .innerJoin(ingredient, eq(ingredient.id, ingredientCompound.ingredientId))
    .innerJoin(compound, eq(compound.id, ingredientCompound.compoundId))
    .where(isNull(ingredientCompound.amountPer100g));
  missing.push(...unfilled.map((r) => `${r.ingredient} · ${r.compound}`).sort());
});

const [{ amounts }] = await sql`select count(*)::int as amounts from ingredient_compound where amount_per_100g is not null`;
console.log(`seeded ${INGREDIENTS.length} ingredients and ${COMPOUNDS.length} compounds`);
console.log(`imported ${amounts} amounts per 100 g from ${foods.size} USDA records`);
console.log(`no amount yet (USDA does not measure these; shown as missing): ${missing.length}`);
for (const pair of missing) console.log(`  ${pair}`);
await sql.end();

/** @return [number | null] the year in a USDA publicationDate such as "4/1/2019" */
function publicationYear(food: FdcFood): number | null {
  const year = food.publicationDate?.match(/(\d{4})$/)?.[1];
  return year ? Number(year) : null;
}
