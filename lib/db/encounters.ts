// What someone has encountered, and what that unlocks. Reading and writing the record happens only here.
import { sql } from "./client.ts";

type Sql = typeof sql;

export type EncounterRow = { food: string; encounteredAt: string; uploadedAt: string };
export type Revealed = { foods: Set<string>; compounds: Set<string>; effects: Set<string> };

/** @return [Promise<EncounterRow[]>] every uploaded encounter, oldest first */
export async function encounterRows(q: Sql = sql): Promise<EncounterRow[]> {
  const rows = await q<{ food: string; encounteredAt: string; uploadedAt: string }[]>`
    select i.slug as food, e.encountered_at as "encounteredAt", e.uploaded_at as "uploadedAt"
    from encounter e join ingredient i on i.id = e.ingredient_id
    order by e.encountered_at, i.slug`;
  return rows.map((r) => ({ food: r.food, encounteredAt: new Date(r.encounteredAt).toISOString(), uploadedAt: new Date(r.uploadedAt).toISOString() }));
}

/** @return [Promise<string[]>] the slugs of every uploaded food */
export async function encounteredFoods(q: Sql = sql): Promise<string[]> {
  return (await encounterRows(q)).map((r) => r.food);
}

/**
 * Stores newly encountered foods. An array naming an unknown food stores nothing.
 * @param items [{ food, encounteredAt }[]] the foods and when they were had
 * @return [Promise<{ added: string[]; unknown: string[] }>] which were new, and any unknown slugs
 */
export async function recordEncounters(items: { food: string; encounteredAt: string }[], q: Sql = sql): Promise<{ added: string[]; unknown: string[] }> {
  const known = await q<{ id: string; slug: string }[]>`select id, slug from ingredient where slug = any(${items.map((i) => i.food)})`;
  const ids = new Map(known.map((k) => [k.slug, k.id]));
  const unknown = items.filter((i) => !ids.has(i.food)).map((i) => i.food);
  if (unknown.length > 0) return { added: [], unknown };
  const added: string[] = [];
  for (const item of items) {
    const inserted = await q`
      insert into encounter (ingredient_id, encountered_at) values (${ids.get(item.food)!}, ${item.encounteredAt})
      on conflict (ingredient_id) do nothing returning id`;
    if (inserted.length > 0) added.push(item.food);
  }
  return { added, unknown: [] };
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
            and (ic.amount_per_100g is null or ic.amount_per_100g < ce.min_food_per_100g)))`;
  const effects = await q<{ slug: string }[]>`
    select distinct e.slug from compound_effect ce
    join effect e on e.id = ce.effect_id
    join ingredient_compound ic on ic.compound_id = ce.compound_id join ingredient i on i.id = ic.ingredient_id
    where i.slug = any(${foods}) and (ic.amount_per_100g is null or ic.amount_per_100g > 0)
      and (ce.min_food_per_100g is null or ic.amount_per_100g >= ce.min_food_per_100g)`;
  return { foods: new Set(foods), compounds: new Set(compounds.map((c) => c.slug)), effects: new Set(effects.map((e) => e.slug)) };
}
