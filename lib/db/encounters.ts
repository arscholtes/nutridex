// What someone has encountered, and what that unlocks. Reading and writing the record happens only here.
import { mayBearClaims } from "./claim-limits.ts";
import { tierOf, type FoodHistory } from "../tiers.ts";
import { sql } from "./client.ts";

type Sql = typeof sql;

export type EncounterRow = { food: string; encounteredAt: string; uploadedAt: string };

export const FORMS = ["raw", "juiced", "cooked"] as const;
export type Form = (typeof FORMS)[number];

/** One time someone had a food. `encounteredAt` is when; the form is null when nobody said. */
export type CatchItem = { food: string; encounteredAt: string; form?: Form | null; /** The slug of the recipe it was had in. */ recipe?: string | null };
export type CatchRow = { food: string; caughtAt: string; form: Form | null; recipe: string | null };
export type RecordResult = { added: string[]; unknown: string[]; misplaced: string[] };
export type Revealed = { foods: Set<string>; compounds: Set<string>; effects: Set<string> };

/**
 * @param owner [string | null] the signed-in person, or null for the record the apps share
 * @return [Promise<EncounterRow[]>] every encounter in that record, oldest first
 */
export async function encounterRows(owner: string | null = null, q: Sql = sql): Promise<EncounterRow[]> {
  const rows = await q<{ food: string; encounteredAt: string; uploadedAt: string }[]>`
    select i.slug as food, e.encountered_at as "encounteredAt", e.uploaded_at as "uploadedAt"
    from encounter e join ingredient i on i.id = e.ingredient_id
    where e.owner_id is not distinct from ${owner}
    order by e.encountered_at, i.slug`;
  return rows.map((r) => ({ food: r.food, encounteredAt: new Date(r.encounteredAt).toISOString(), uploadedAt: new Date(r.uploadedAt).toISOString() }));
}

/** @return [Promise<string[]>] the slugs of every food in one record */
export async function encounteredFoods(owner: string | null = null, q: Sql = sql): Promise<string[]> {
  return (await encounterRows(owner, q)).map((r) => r.food);
}

/**
 * @param value [unknown] what an app sent as its encounters
 * @return [CatchItem[] | null] the same items, or null when it is not an array of foods with dates, known forms and recipe slugs
 */
export function parseCatchItems(value: unknown): CatchItem[] | null {
  if (!Array.isArray(value)) return null;
  const formOf = (v: unknown): Form | null | undefined => (v === undefined || v === null ? null : FORMS.find((f) => f === v));
  const items: CatchItem[] = [];
  for (const i of value as Record<string, unknown>[]) {
    if (typeof i?.food !== "string" || typeof i.encounteredAt !== "string" || Number.isNaN(Date.parse(i.encounteredAt))) return null;
    const form = formOf(i.form);
    if (form === undefined) return null;
    if (i.recipe !== undefined && i.recipe !== null && typeof i.recipe !== "string") return null;
    items.push({ food: i.food, encounteredAt: i.encounteredAt, form, recipe: i.recipe ?? null });
  }
  return items;
}

/**
 * Stores each time a food was had. The first time someone has a food they own it, which is what unlocks things;
 * every time, that one included, is a catch. An array naming an unknown food, or a recipe that this record cannot
 * see or that does not hold the food, stores nothing.
 * @param items [CatchItem[]] the foods, when they were had, and in what form and recipe if known
 * @param owner [string | null] whose record, or null for the one the apps share
 * @return [Promise<RecordResult>] which foods were new to this record, any unknown slugs, and any "food in recipe" that does not hold
 */
export async function recordEncounters(items: CatchItem[], owner: string | null = null, q: Sql = sql): Promise<RecordResult> {
  const known = await q<{ id: string; slug: string }[]>`select id, slug from ingredient where slug = any(${items.map((i) => i.food)})`;
  const ids = new Map(known.map((k) => [k.slug, k.id]));
  const unknown = items.filter((i) => !ids.has(i.food)).map((i) => i.food);
  if (unknown.length > 0) return { added: [], unknown, misplaced: [] };
  const named = [...new Set(items.flatMap((i) => (i.recipe ? [i.recipe] : [])))];
  // Seeded recipes are everyone's; one somebody built is theirs alone.
  const inRecipes = await q<{ recipe: string; id: string; food: string }[]>`
    select r.slug as recipe, r.id, i.slug as food
      from recipe r join recipe_ingredient ri on ri.recipe_id = r.id join ingredient i on i.id = ri.ingredient_id
     where r.slug = any(${named}) and (r.owner_id is null or r.owner_id = ${owner})`;
  const recipeIds = new Map(inRecipes.map((r) => [`${r.food} in ${r.recipe}`, r.id]));
  const misplaced = items.flatMap((i) => (i.recipe && !recipeIds.has(`${i.food} in ${i.recipe}`) ? [`${i.food} in ${i.recipe}`] : []));
  if (misplaced.length > 0) return { added: [], unknown: [], misplaced };
  const added: string[] = [];
  for (const item of items) {
    // xmax is 0 only on a row this statement inserted, which is how a new food is told from one already owned.
    const [owned] = await q<{ id: string; fresh: boolean }[]>`
      insert into encounter (ingredient_id, encountered_at, owner_id) values (${ids.get(item.food)!}, ${item.encounteredAt}, ${owner})
      on conflict on constraint encounter_owner_ingredient
      do update set encountered_at = least(encounter.encountered_at, excluded.encountered_at)
      returning id, (xmax = 0) as fresh`;
    if (owned.fresh && !added.includes(item.food)) added.push(item.food);
    await q`
      insert into catch (encounter_id, caught_at, form, recipe_id)
      values (${owned.id}, ${item.encounteredAt}, ${item.form ?? null}, ${item.recipe ? recipeIds.get(`${item.food} in ${item.recipe}`)! : null})
      on conflict on constraint catch_encounter_caught_at do nothing`;
  }
  return { added, unknown: [], misplaced: [] };
}

/**
 * @param owner [string | null] the signed-in person, or null for the record the apps share
 * @return [Promise<CatchRow[]>] every time a food was had in that record, oldest first
 */
export async function catchRows(owner: string | null = null, q: Sql = sql): Promise<CatchRow[]> {
  const rows = await q<CatchRow[]>`
    select i.slug as food, c.caught_at as "caughtAt", c.form, r.slug as recipe
    from catch c join encounter e on e.id = c.encounter_id join ingredient i on i.id = e.ingredient_id
      left join recipe r on r.id = c.recipe_id
    where e.owner_id is not distinct from ${owner}
    order by c.caught_at, i.slug`;
  return rows.map((r) => ({ ...r, caughtAt: new Date(r.caughtAt).toISOString() }));
}

export type OwnedFood = { food: string; firstHadAt: string; catches: number; forms: number; tier: number };

/**
 * @param owner [string | null] the signed-in person, or null for the record the apps share
 * @return [Promise<OwnedFood[]>] each food that record owns, oldest first, with how often it was had and its research tier
 */
export async function ownedFoods(owner: string | null = null, q: Sql = sql): Promise<OwnedFood[]> {
  const histories = await foodHistories(owner, q);
  return (await encounterRows(owner, q)).map((e) => {
    const history = histories.get(e.food)!;
    return { food: e.food, firstHadAt: e.encounteredAt, catches: history.catches, forms: history.forms, tier: tierOf(history) };
  });
}

/**
 * @param owner [string | null] the signed-in person, or null for the record the apps share
 * @return [Promise<Map<string, FoodHistory>>] by food slug, what that record has done with each food it owns
 */
export async function foodHistories(owner: string | null = null, q: Sql = sql): Promise<Map<string, FoodHistory>> {
  const rows = await q<{ food: string; catches: number; forms: number; cooked: number; recipes: number }[]>`
    select i.slug as food, count(c.id)::int as catches, count(distinct c.form)::int as forms,
      count(c.recipe_id)::int as cooked, count(distinct c.recipe_id)::int as recipes
    from encounter e join ingredient i on i.id = e.ingredient_id left join catch c on c.encounter_id = e.id
    where e.owner_id is not distinct from ${owner}
    group by i.slug`;
  // Nothing records an opened source yet, so every history says none.
  return new Map(rows.map(({ food, ...counts }) => [food, { ...counts, sourcesOpened: 0 }]));
}

/**
 * What a set of foods unlocks: compounds each is a real source of, carries where no bar applies, or
 * holds the most of in the Dex, so every nutrient can be unlocked; and the effects each clears a bar
 * for. A trace of a nutrient does not count.
 * @param foods [string[]] food slugs
 * @return [Promise<Revealed>] everything visible
 */
export async function revealedEntries(foods: string[], q: Sql = sql): Promise<Revealed> {
  const compounds = await q<{ slug: string }[]>`
    select distinct c.slug from ingredient_compound ic
    join ingredient i on i.id = ic.ingredient_id join compound c on c.id = ic.compound_id
    where i.slug = any(${foods}) and (ic.amount_per_100g is null or ic.amount_per_100g > 0)
      and (
        ic.amount_per_100g = (select max(x.amount_per_100g) from ingredient_compound x where x.compound_id = c.id)
        or not exists (
          select 1 from compound_effect ce where ce.compound_id = c.id and ce.min_food_per_100g is not null
            and (ic.amount_per_100g is null or ic.amount_per_100g < ce.min_food_per_100g or not ${mayBearClaims(q)})))`;
  const effects = await q<{ slug: string }[]>`
    select distinct e.slug from compound_effect ce
    join effect e on e.id = ce.effect_id
    join ingredient_compound ic on ic.compound_id = ce.compound_id join ingredient i on i.id = ic.ingredient_id
    where i.slug = any(${foods}) and (ic.amount_per_100g is null or ic.amount_per_100g > 0)
      and (ce.min_food_per_100g is null or ic.amount_per_100g >= ce.min_food_per_100g) and ${mayBearClaims(q)}`;
  return { foods: new Set(foods), compounds: new Set(compounds.map((c) => c.slug)), effects: new Set(effects.map((e) => e.slug)) };
}

/**
 * The sources behind what is unlocked: each food's USDA record, and whatever an unlocked compound or effect rests on.
 * @param r [Revealed] what is unlocked
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<string[]>] source ids
 */
export async function sourcesBehind(r: Revealed, q: Sql = sql): Promise<string[]> {
  const foods = [...r.foods];
  const compounds = [...r.compounds];
  const effects = [...r.effects];
  const rows = await q<{ id: string }[]>`
    select ic.source_id as id from ingredient_compound ic join ingredient i on i.id = ic.ingredient_id
      where i.slug = any(${foods}::text[]) and ic.source_id is not null
    union select ce.source_id from compound_effect ce join compound c on c.id = ce.compound_id where c.slug = any(${compounds}::text[])
    union select ce.source_id from compound_effect ce join effect e on e.id = ce.effect_id where e.slug = any(${effects}::text[])
    union select a.source_id from absorption_modifier_applied a join compound c on c.id = a.compound_id where c.slug = any(${compounds}::text[])
    union select p.source_id from prep_effect p join compound c on c.id = p.compound_id where c.slug = any(${compounds}::text[])
    union select k.source_id from caution k join compound c on c.id = k.compound_id where c.slug = any(${compounds}::text[])`;
  return rows.map((row) => row.id);
}
