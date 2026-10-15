// npm run seed — fills the database with the plan's seed ingredients and compounds, imports their
// amounts per 100 g from USDA FoodData Central, and adds the sourced facts and the recipe the
// engine's first check needs. Safe to re-run: every write is an upsert, and a recipe that already
// exists is left as it is.
//
// All USDA records are fetched before anything is written, so a network failure leaves the
// database untouched. Amounts are stored exactly as USDA reports them, each with a source row
// naming the USDA record; a compound USDA does not measure keeps a null amount.
import { and, eq, inArray, isNull, notInArray, type SQL } from "drizzle-orm";
import { COMPOUNDS } from "../data/seed/compounds.ts";
import { CLASSES, MODIFIERS, PREP_EFFECTS, SOURCES } from "../data/seed/facts.ts";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { RECIPES } from "../data/seed/recipes.ts";
import { db, sql } from "../lib/db/client.ts";
import {
  absorptionModifier,
  compound,
  compoundClass,
  compoundClassMember,
  ingredient,
  ingredientCompound,
  modifierMeasuredMember,
  prepEffect,
  recipe,
  recipeIngredient,
  source,
} from "../lib/db/schema.ts";
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
    const values = { name: c.name, class: c.class, chebiId: c.chebiId ?? null };
    const [row] = await tx
      .insert(compound)
      .values({ slug: c.slug, ...values })
      .onConflictDoUpdate({ target: compound.slug, set: values })
      .returning({ id: compound.id });
    compoundIds.set(c.slug, row.id);
  }

  const ingredientIds = new Map<string, string>();
  for (const seed of INGREDIENTS) {
    const values = { name: seed.name, category: seed.category, usdaFdcId: seed.usdaFdcId };
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

  const sourceIds = new Map<string, string>();
  for (const s of SOURCES) {
    const { key, ...values } = s;
    const [existing] = await tx.select({ id: source.id }).from(source).where(eq(source.url, s.url));
    const id = existing
      ? (await tx.update(source).set(values).where(eq(source.id, existing.id)).returning({ id: source.id }))[0].id
      : (await tx.insert(source).values(values).returning({ id: source.id }))[0].id;
    sourceIds.set(key, id);
  }

  const classIds = new Map<number, string>();
  for (const k of CLASSES) {
    const values = { name: k.name, sourceId: sourceIds.get(k.source)! };
    const [row] = await tx
      .insert(compoundClass)
      .values({ chebiId: k.chebiId, ...values })
      .onConflictDoUpdate({ target: compoundClass.chebiId, set: values })
      .returning({ id: compoundClass.id });
    classIds.set(k.chebiId, row.id);
    await tx.delete(compoundClassMember).where(eq(compoundClassMember.classId, row.id));
    await tx.insert(compoundClassMember).values(
      k.members.map((slug) => ({ classId: row.id, compoundId: compoundIds.get(slug)!, sourceId: values.sourceId })),
    );
  }

  // The seed owns the modifier rows of the sources it lists: rows it no longer lists are removed.
  const seededModifierIds: string[] = [];
  for (const m of MODIFIERS) {
    const values = {
      targetCompoundId: "compound" in m.target ? compoundIds.get(m.target.compound)! : null,
      targetClassId: "chebiClass" in m.target ? classIds.get(m.target.chebiClass)! : null,
      modifierCompoundId: m.modifierCompound === null ? null : compoundIds.get(m.modifierCompound)!,
      modifierCondition: m.condition,
      direction: m.direction,
      magnitude: m.magnitude,
      mechanism: m.mechanism,
      evidenceGrade: m.grade,
      sourceId: sourceIds.get(m.source)!,
    };
    const same = and(
      matches(absorptionModifier.targetCompoundId, values.targetCompoundId),
      matches(absorptionModifier.targetClassId, values.targetClassId),
      matches(absorptionModifier.modifierCompoundId, values.modifierCompoundId),
      matches(absorptionModifier.modifierCondition, values.modifierCondition),
      eq(absorptionModifier.sourceId, values.sourceId),
    );
    const [existing] = await tx.select({ id: absorptionModifier.id }).from(absorptionModifier).where(same);
    const id = existing
      ? (await tx.update(absorptionModifier).set(values).where(eq(absorptionModifier.id, existing.id)).returning({ id: absorptionModifier.id }))[0].id
      : (await tx.insert(absorptionModifier).values(values).returning({ id: absorptionModifier.id }))[0].id;
    seededModifierIds.push(id);
    await tx.delete(modifierMeasuredMember).where(eq(modifierMeasuredMember.modifierId, id));
    if ("chebiClass" in m.target) {
      await tx.insert(modifierMeasuredMember).values(m.target.measured.map((slug) => ({ modifierId: id, compoundId: compoundIds.get(slug)! })));
    }
  }
  const seededSourceIds = [...new Set(MODIFIERS.map((m) => sourceIds.get(m.source)!))];
  await tx
    .delete(absorptionModifier)
    .where(and(inArray(absorptionModifier.sourceId, seededSourceIds), notInArray(absorptionModifier.id, seededModifierIds)));

  for (const p of PREP_EFFECTS) {
    const values = {
      compoundId: compoundIds.get(p.compound)!,
      prepMethod: p.prepMethod,
      retentionFactor: p.retentionFactor,
      direction: p.direction,
      bioavailabilityNote: p.note,
      sourceId: sourceIds.get(p.source)!,
    };
    const same = and(eq(prepEffect.compoundId, values.compoundId), eq(prepEffect.prepMethod, p.prepMethod), eq(prepEffect.sourceId, values.sourceId));
    const [existing] = await tx.select({ id: prepEffect.id }).from(prepEffect).where(same);
    if (existing) await tx.update(prepEffect).set(values).where(eq(prepEffect.id, existing.id));
    else await tx.insert(prepEffect).values(values);
  }

  for (const r of RECIPES) {
    const [created] = await tx
      .insert(recipe)
      .values({ slug: r.slug, name: r.name, servings: r.servings })
      .onConflictDoNothing({ target: recipe.slug })
      .returning({ id: recipe.id });
    if (!created) continue;
    await tx.insert(recipeIngredient).values(
      r.ingredients.map((ri, position) => ({
        recipeId: created.id,
        ingredientId: ingredientIds.get(ri.ingredientSlug)!,
        grams: ri.grams,
        prepMethod: ri.prepMethod,
        position,
      })),
    );
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
console.log(`seeded ${MODIFIERS.length} absorption modifiers and ${PREP_EFFECTS.length} prep effects from ${SOURCES.length} sources`);
console.log(`seeded ${CLASSES.length} ChEBI class(es) with ${CLASSES.reduce((n, k) => n + k.members.length, 0)} member(s)`);
console.log(`seeded ${RECIPES.length} recipe(s), leaving any that already existed as they were`);
console.log(`no amount yet (USDA does not measure these; shown as missing): ${missing.length}`);
for (const pair of missing) console.log(`  ${pair}`);
await sql.end();

/** @return [number | null] the year in a USDA publicationDate such as "4/1/2019" */
function publicationYear(food: FdcFood): number | null {
  const year = food.publicationDate?.match(/(\d{4})$/)?.[1];
  return year ? Number(year) : null;
}

/** @return [SQL] `column = value`, or `column is null` when value is null */
function matches(column: Parameters<typeof eq>[0], value: string | null): SQL {
  return value === null ? isNull(column) : eq(column, value);
}
