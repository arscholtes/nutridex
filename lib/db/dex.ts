// What the Dex screens show, read from the database. An ingredient's flags and effects come from
// the engine run on 100 g of it, so a Dex entry and a recipe judge the same facts the same way.
import type { Revealed } from "./encounters.ts";
import { DEFAULT_SETTINGS, recipeProfile, type AbsorptionFlag, type Basis, type CautionFlag, type Grade, type Unit } from "epistasis";
import { PANEL, PANEL_COMPOUNDS, type PanelGroup } from "../usda/nutrients.ts";
import { sql } from "./client.ts";
import { mayBearClaims } from "./claim-limits.ts";
import { bentoTiles, type BentoTile } from "./effect-tiles.ts";
import { loadFacts } from "./engine-input.ts";

type Sql = typeof sql;

export type Named = { slug: string; name: string };

export type SourceRef = {
  id: string;
  title: string;
  url: string | null;
  year: number | null;
  studyType: string | null;
  limitations: string | null;
};

/** One food's amount of one compound, against the richest seeded food for that compound. */
export type FoodAmount = Named & {
  imageUrl: string | null;
  amount: number;
  unit: Unit;
  /** Per typical serving, when the food has one on file. */
  perServing: number | null;
  /** amount ÷ the most any seeded food carries, 0 to 1. */
  share: number;
};

/** One row of a food's nutrient panel: USDA's amount per 100 g and its share of the richest food in the Dex, both null when USDA has none. */
export type PanelRow = {
  slug: string;
  name: string;
  group: PanelGroup;
  amount: number | null;
  unit: Unit | null;
  share: number | null;
  /** True when the nutrient is not unlocked yet, so it has no page to link to. */
  locked?: boolean;
};

/** One compound in a food, against the richest seeded food for that compound. */
export type CompoundAmount = Named & {
  class: string | null;
  amount: number;
  unit: Unit;
  share: number;
  /** The richest seeded food, or null when naming it would give away a food not yet encountered. */
  richest: Named | null;
};

/** Foods and compounds a source measured as none, or that no source measured. */
export type Absences = { none: Named[]; unmeasured: Named[] };

export type AbsorptionTip = {
  flag: AbsorptionFlag;
  compound: Named;
  /** The ChEBI class a by-class flag reaches the compound through. */
  className: string | null;
  sources: SourceRef[];
};

export type ModifierClaim = {
  ruleId: string;
  basis: Basis;
  className: string | null;
  direction: "enhances" | "inhibits";
  condition: string | null;
  modifierCompound: Named | null;
  magnitude: string | null;
  mechanism: string | null;
  grade: Grade;
  source: SourceRef;
};

export type PrepClaim = {
  compound: Named;
  method: string;
  retentionFactor: number | null;
  direction: string | null;
  note: string | null;
  source: SourceRef;
};

export type EffectClaim = {
  effect: Named & { direction: string; bodySystem: string | null };
  compound: Named & { class: string | null };
  summary: string | null;
  doseContext: string | null;
  onset: string | null;
  /** The amount per 100 g a food must reach for the claim to apply to it; null when the source sets no bar. */
  minFoodPer100g: number | null;
  grade: Grade;
  source: SourceRef;
};

/** A neighbouring entry in the dex. */
export type DexStep = Named & { number: string; href: string };

/** An entry's place in the dex and the entries either side of it within its kind. */
export type DexPager = { number: string; total: number; prev: DexStep | null; next: DexStep | null };

/** One of USDA's household measures for a food: "1 cup chopped" of raw carrot is 128 g. */
export type Portion = { amount: number; description: string; grams: number };

export type IngredientEntry = {
  ingredient: Named & { category: string | null; imageUrl: string | null };
  pager: DexPager;
  /** How many compounds USDA gives this food a value for, zeros included. */
  measured: number;
  /** Ranked by share of the richest seeded food: what this food stands out for. */
  compounds: CompoundAmount[];
  absent: Absences;
  /** The 30-nutrient panel in display order; panel nutrients are not repeated in compounds or absent. */
  panel: PanelRow[];
  /** USDA's household measures, in USDA's order. */
  portions: Portion[];
  absorption: AbsorptionTip[];
  /** What the missed absorption flags suggest adding. */
  pairsWellWith: string[];
  prep: PrepClaim[];
  /** False for a drink the law lets bear no claim, which then has no effects. */
  bearsClaims: boolean;
  /** The effects of the compounds it carries, each with the evidence behind it. */
  effects: EffectClaim[];
  /** The same effects as tiles, sized by how much of a daily amount is behind each. */
  tiles: BentoTile[];
  cautions: CautionFlag[];
  sources: SourceRef[];
  bestGrade: Grade | null;
};

export type CompoundEntry = {
  pager: DexPager;
  compound: Named & {
    class: string | null;
    chebiId: number | null;
    solubility: string | null;
    heatStability: string | null;
    lightStability: string | null;
    mechanismSummary: string | null;
    mechanismDetail: string | null;
  };
  classes: { name: string; chebiId: number }[];
  /** Ranked by amount per 100 g. */
  foods: FoodAmount[];
  absent: Absences;
  modifiers: ModifierClaim[];
  prep: PrepClaim[];
  effects: EffectClaim[];
  cautions: { kind: string; summary: string; grade: Grade; source: SourceRef }[];
  sources: SourceRef[];
  bestGrade: Grade | null;
};

export type EffectEntry = {
  pager: DexPager;
  effect: Named & { direction: string; bodySystem: string | null };
  /** Best grade first. */
  compounds: EffectClaim[];
  /** Per contributing compound, the foods that carry it, most first. */
  foods: { compound: Named; bar: number | null; ranked: FoodAmount[]; unmeasured: Named[] }[];
  sources: SourceRef[];
  bestGrade: Grade | null;
};

export type EntryKind = "ingredient" | "compound" | "effect";

export type EntryCard = Named & {
  kind: EntryKind;
  /** Its dex number, such as F006. */
  number: string;
  href: string;
  /** Its category, compound class or body system. */
  type: string | null;
  imageUrl: string | null;
  compoundClass: string | null;
  bestGrade: Grade | null;
  stats: string[];
};

export type SourceUse = SourceRef & { doi: string | null; pmid: string | null; population: string | null; supports: string[] };

const ENTRY_GRAMS = 100;

// SR Legacy holds hundreds of foods matching a word like "chicken", more than anyone would scroll.
// A search ranks names starting with the words first, shortest first, so the plain food leads what is made with it.
const FOODS_SHOWN = 30;

// Names containing the words win; when none does, a name this close counts as a misspelling of it
// (pg_trgm word similarity, 0 to 1). Measured: "tumeric" scores 0.55 against Turmeric and 0.13
// against Tomato paste, the next closest name; "skin" scores 0.4 against Canned pumpkin purée.
const SEARCH_SIMILARITY = 0.4;

/**
 * One ingredient's Dex entry.
 * @param slug [string] the ingredient's slug
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<IngredientEntry | null>] null when no ingredient has that slug
 */
export async function ingredientEntry(slug: string, q: Sql = sql): Promise<IngredientEntry | null> {
  const [row] = await q<{ id: string; slug: string; name: string; category: string | null; imageUrl: string | null; bearsClaims: boolean }[]>`
    select i.id, i.slug, i.name, i.category, i.image_url as "imageUrl", ${mayBearClaims(q)} as "bearsClaims"
    from ingredient i where i.slug = ${slug}`;
  if (!row) return null;

  const amounts = await q<{ slug: string; name: string; class: string | null; amount: string | null; unit: Unit | null; sourceId: string | null; richestAmount: string | null; richestSlug: string | null; richestName: string | null }[]>`
    select c.slug, c.name, c.class, ic.amount_per_100g as amount, ic.unit, ic.source_id as "sourceId",
           top.amount_per_100g as "richestAmount", top.slug as "richestSlug", top.name as "richestName"
    from ingredient_compound ic
    join compound c on c.id = ic.compound_id
    left join lateral (
      select x.amount_per_100g, i.slug, i.name from ingredient_compound x join ingredient i on i.id = x.ingredient_id
      where x.compound_id = c.id and x.amount_per_100g = (${richestAmount(q, q`c.id`, q`y.amount_per_100g is not null`)})
      order by i.name limit 1
    ) top on true
    where ic.ingredient_id = ${row.id}
    order by c.name`;
  const panelNames = new Map(
    (await q<{ slug: string; name: string }[]>`select slug, name from compound where slug = any(${PANEL.map((p) => p.slug)})`).map((c) => [c.slug, c.name]),
  );
  const panel = PANEL.map((p): PanelRow => {
    const a = amounts.find((x) => x.slug === p.slug && x.amount !== null);
    const top = Number(a?.richestAmount);
    return {
      slug: p.slug,
      name: panelNames.get(p.slug)!,
      group: p.group,
      amount: a ? Number(a.amount) : null,
      unit: a ? a.unit : null,
      share: a ? (top > 0 ? Number(a.amount) / top : 0) : null,
    };
  });
  const others = amounts.filter((a) => !PANEL_COMPOUNDS.includes(a.slug));
  const compounds = others
    .filter((a) => a.amount !== null && Number(a.amount) > 0)
    .map((a): CompoundAmount => ({
      slug: a.slug,
      name: a.name,
      class: a.class,
      amount: Number(a.amount),
      unit: a.unit!,
      share: Number(a.amount) / Number(a.richestAmount),
      richest: { slug: a.richestSlug!, name: a.richestName! },
    }))
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
  const absent = {
    none: others.filter((a) => a.amount !== null && Number(a.amount) === 0).map(named),
    unmeasured: others.filter((a) => a.amount === null).map(named),
  };
  const compoundNames = new Map(amounts.map((a) => [a.slug, a.name]));

  const facts = await loadFacts([slug], q);
  const profile = recipeProfile(
    { slug: `dex-${slug}`, servings: 1, ingredients: [{ id: slug, ingredientSlug: slug, grams: ENTRY_GRAMS, prepMethod: "raw", retentionFamily: null }], steps: [] },
    facts,
    DEFAULT_SETTINGS,
    [],
  );

  const rules = await rulesById(profile.absorption.flatMap((f) => f.ruleIds), q);
  const absorption = profile.absorption.map((flag): AbsorptionTip => {
    const behind = flag.ruleIds.map((id) => rules.get(id)!);
    return {
      flag,
      compound: { slug: flag.compoundSlug, name: compoundNames.get(flag.compoundSlug)! },
      className: flag.basis === "by-class" ? (behind.find((r) => r.className !== null)?.className ?? null) : null,
      sources: dedupe(behind.map((r) => r.source)),
    };
  }).sort((a, b) => a.compound.name.localeCompare(b.compound.name));

  const present = profile.effects.flatMap((e) => e.compounds);
  const measured = new Map(amounts.map((a) => [a.slug, a.amount === null ? null : Number(a.amount)]));
  const effects = !row.bearsClaims ? [] : (await effectClaims({ compounds: present }, q)).filter(
    (e) => profile.effects.some((r) => r.effectSlug === e.effect.slug) && (e.minFoodPer100g === null || (measured.get(e.compound.slug) ?? 0) >= e.minFoodPer100g),
  );
  const prep = await prepClaims(amounts.map((a) => a.slug), q);
  const usda = await sourcesByIds([...new Set(amounts.flatMap((a) => (a.sourceId ? [a.sourceId] : [])))], q);
  const portions = (
    await q<{ amount: string; description: string; grams: string }[]>`select amount, description, grams from portion where ingredient_id = ${row.id} order by seq`
  ).map((p): Portion => ({ amount: Number(p.amount), description: p.description, grams: Number(p.grams) }));

  const sources = dedupe([...usda, ...absorption.flatMap((a) => a.sources), ...effects.map((e) => e.source), ...prep.map((p) => p.source)]);
  return {
    ingredient: { slug: row.slug, name: row.name, category: row.category, imageUrl: row.imageUrl },
    pager: (await dexPager("ingredient", slug, q))!,
    measured: amounts.filter((a) => a.amount !== null).length,
    compounds,
    absent,
    panel,
    portions,
    absorption,
    pairsWellWith: [...new Set(profile.absorption.flatMap((f) => (f.status === "missed" && f.suggestion ? [f.suggestion] : [])))],
    prep,
    bearsClaims: row.bearsClaims,
    effects,
    tiles: bentoTiles(effects, new Map(amounts.map((a) => [a.slug, { amount: a.amount === null ? null : Number(a.amount) }]))),
    cautions: profile.cautions,
    sources,
    bestGrade: best([...absorption.map((a) => a.flag.grade), ...effects.map((e) => e.grade), ...profile.cautions.flatMap((c) => (c.grade ? [c.grade] : []))]),
  };
}

/**
 * One compound's Dex entry.
 * @param slug [string] the compound's slug
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<CompoundEntry | null>] null when no compound has that slug
 */
export async function compoundEntry(slug: string, q: Sql = sql): Promise<CompoundEntry | null> {
  const [row] = await q<{ id: string; slug: string; name: string; class: string | null; chebiId: number | null; solubility: string | null; heatStability: string | null; lightStability: string | null; mechanismSummary: string | null; mechanismDetail: string | null }[]>`
    select id, slug, name, class, chebi_id as "chebiId", solubility, heat_stability as "heatStability",
           light_stability as "lightStability", mechanism_summary as "mechanismSummary", mechanism_detail as "mechanismDetail"
    from compound where slug = ${slug}`;
  if (!row) return null;
  const { id, ...compound } = row;

  const classes = await q<{ name: string; chebiId: number }[]>`
    select k.name, k.chebi_id as "chebiId" from compound_class_member m join compound_class k on k.id = m.class_id
    where m.compound_id = ${id} order by k.name`;
  const { ranked: foods, absent } = await foodsCarrying(id, q);

  const modifierRows = await q<{ ruleId: string; basis: Basis; className: string | null; direction: "enhances" | "inhibits"; condition: string | null; modifierSlug: string | null; modifierName: string | null; magnitude: string | null; mechanism: string | null; grade: Grade; sourceId: string }[]>`
    select a.modifier_id as "ruleId", a.basis, k.name as "className", a.direction, a.modifier_condition as condition,
           m.slug as "modifierSlug", m.name as "modifierName", a.magnitude, a.mechanism, a.evidence_grade as grade, a.source_id as "sourceId"
    from absorption_modifier_applied a
    join absorption_modifier r on r.id = a.modifier_id
    left join compound_class k on k.id = r.target_class_id
    left join compound m on m.id = a.modifier_compound_id
    where a.compound_id = ${id}
    order by a.basis desc, a.evidence_grade`;
  const cautionRows = await q<{ kind: string; summary: string; grade: Grade; sourceId: string }[]>`
    select kind, summary, evidence_grade as grade, source_id as "sourceId" from caution where compound_id = ${id} order by evidence_grade`;
  const refs = await sourceMap([...modifierRows.map((m) => m.sourceId), ...cautionRows.map((c) => c.sourceId)], q);

  const modifiers = modifierRows.map(({ sourceId, modifierSlug, modifierName, ...m }): ModifierClaim => ({
    ...m,
    className: m.basis === "by-class" ? m.className : null,
    modifierCompound: modifierSlug === null ? null : { slug: modifierSlug, name: modifierName! },
    source: refs.get(sourceId)!,
  }));
  const cautions = cautionRows.map(({ sourceId, ...c }) => ({ ...c, source: refs.get(sourceId)! }));
  const effects = await effectClaims({ compounds: [slug] }, q);
  const prep = await prepClaims([slug], q);

  return {
    pager: (await dexPager("compound", slug, q))!,
    compound,
    classes: [...classes],
    foods,
    absent,
    modifiers,
    prep,
    effects,
    cautions,
    sources: dedupe([...modifiers.map((m) => m.source), ...prep.map((p) => p.source), ...effects.map((e) => e.source), ...cautions.map((c) => c.source)]),
    bestGrade: best([...modifiers.map((m) => m.grade), ...effects.map((e) => e.grade), ...cautions.map((c) => c.grade)]),
  };
}

/**
 * One effect's page: the compounds behind it and the foods that carry them.
 * @param slug [string] the effect's slug
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<EffectEntry | null>] null when no effect has that slug
 */
export async function effectEntry(slug: string, q: Sql = sql): Promise<EffectEntry | null> {
  const [row] = await q<{ slug: string; name: string; direction: string; bodySystem: string | null }[]>`
    select slug, name, direction, body_system as "bodySystem" from effect where slug = ${slug}`;
  if (!row) return null;
  const compounds = await effectClaims({ effect: slug }, q);
  const ids = await q<{ id: string; slug: string; name: string }[]>`
    select id, slug, name from compound where slug = any(${[...new Set(compounds.map((c) => c.compound.slug))]}) order by name`;
  const claimless = new Set((await q<{ slug: string }[]>`select i.slug from ingredient i where not ${mayBearClaims(q)}`).map((r) => r.slug));
  const foods = [];
  for (const c of ids) {
    const bar = compounds.find((claim) => claim.compound.slug === c.slug)!.minFoodPer100g;
    const { ranked, absent } = await foodsCarrying(c.id, q);
    const claimable = <T extends { slug: string }>(list: T[]) => list.filter((f) => !claimless.has(f.slug));
    foods.push({
      compound: { slug: c.slug, name: c.name },
      bar,
      ranked: claimable(bar === null ? ranked : ranked.filter((f) => f.amount >= bar)),
      unmeasured: bar === null ? claimable(absent.unmeasured) : [],
    });
  }
  return {
    pager: (await dexPager("effect", slug, q))!,
    effect: row,
    compounds,
    foods,
    sources: dedupe(compounds.map((c) => c.source)),
    bestGrade: best(compounds.map((c) => c.grade)),
  };
}

/**
 * The largest amount of one compound in any food, read off the head of the `ingredient_compound_richest`
 * index. Asking for the richest food by sorting every food that carries the compound reads thousands of
 * rows per compound; finding this amount first and then the foods that hold exactly it reads a handful.
 * Counts beside it use count(*) so they are answered from the same index without visiting the table.
 */
const richestAmount = (q: Sql, compoundId: ReturnType<Sql>, counted: ReturnType<Sql>) => q`
  select y.amount_per_100g from ingredient_compound y
  where y.compound_id = ${compoundId} and ${counted}
  order by y.amount_per_100g desc nulls last limit 1`;

const KIND_PREFIX: Record<EntryKind, string> = { ingredient: "F", compound: "C", effect: "E" };

/** @return [string] an entry's dex number from its place within its kind, such as F006 */
function dexNumber(kind: EntryKind, place: number): string {
  return `${KIND_PREFIX[kind]}${String(place).padStart(3, "0")}`;
}

/** Every ingredient, compound and effect, numbered by name within its kind before anything filters them. */
const numberedEntries = (q: Sql) => q`
  select *, row_number() over (partition by kind order by name)::int as place from (
    select 'ingredient' as kind, slug, name, category as type, image_url as "imageUrl", null as "compoundClass" from ingredient
    union all select 'compound', slug, name, class, null, class from compound
    union all select 'effect', slug, name, body_system, null, null from effect
  ) unnumbered`;

export type WallSlot = { kind: EntryKind; slug: string; name: string; number: string; imageUrl: string | null; compoundClass: string | null };

export const WALL_PAGE = 60;

/**
 * One page of the whole Dex in number order, foods then compounds then effects, whatever is unlocked.
 * A slot's name and slug are for drawing its shape and matching it to what is unlocked; they must not
 * reach someone who has not unlocked it.
 * @param search [{ kind?, page }] one kind or all, and the page, counted from 1
 * @return [Promise<WallSlot[]>] up to WALL_PAGE slots; none past the end
 */
export async function wallPage(search: { kind?: EntryKind; page: number }, q: Sql = sql): Promise<WallSlot[]> {
  const rows = await q<{ kind: EntryKind; slug: string; name: string; imageUrl: string | null; compoundClass: string | null; place: number }[]>`
    select kind, slug, name, "imageUrl", "compoundClass", place from (${numberedEntries(q)}) numbered
    where ${search.kind ?? null}::text is null or kind = ${search.kind ?? null}
    order by array_position(array['ingredient', 'compound', 'effect'], kind), place
    limit ${WALL_PAGE} offset ${(Math.max(1, Math.floor(search.page)) - 1) * WALL_PAGE}`;
  return rows.map((r) => ({ kind: r.kind, slug: r.slug, name: r.name, number: dexNumber(r.kind, r.place), imageUrl: r.imageUrl, compoundClass: r.compoundClass }));
}

/**
 * Every entry of a kind as a step, whatever is unlocked.
 * @param kind [EntryKind] the kind
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<DexStep[]>] in number order
 */
export async function dexSteps(kind: EntryKind, q: Sql = sql): Promise<DexStep[]> {
  const rows = await q<{ slug: string; name: string; place: number }[]>`
    select slug, name, place from (${numberedEntries(q)}) numbered where kind = ${kind} order by place`;
  return rows.map((r) => ({ slug: r.slug, name: r.name, number: dexNumber(kind, r.place), href: hrefOf(kind, r.slug) }));
}

/**
 * An entry's dex number and its neighbours within its kind.
 * @param kind [EntryKind] the entry's kind
 * @param slug [string] the entry's slug
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<DexPager | null>] null when no entry of that kind has that slug
 */
export async function dexPager(kind: EntryKind, slug: string, q: Sql = sql): Promise<DexPager | null> {
  const steps = await dexSteps(kind, q);
  const at = steps.findIndex((r) => r.slug === slug);
  if (at === -1) return null;
  return { number: steps[at].number, total: steps.length, prev: steps[at - 1] ?? null, next: steps[at + 1] ?? null };
}

/**
 * How many entries the dex holds, for the home tabs.
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<Record<EntryKind, number>>] the count of each kind
 */
export async function dexCounts(q: Sql = sql): Promise<Record<EntryKind, number>> {
  const rows = await q<{ kind: EntryKind; n: number }[]>`
    select kind, count(*)::int as n from (${numberedEntries(q)}) numbered group by kind`;
  return Object.fromEntries(rows.map((r) => [r.kind, r.n])) as Record<EntryKind, number>;
}

/**
 * Ingredients, compounds and effects as Dex cards, matching a search and filters. Only the cards
 * asked for are worked out, since a card's stats read every amount of what it describes.
 * @param search [{ q?, kind?, type?, within?, limit? }] words to match (fuzzily), an entry kind, a type badge,
 *   what is unlocked (nothing else is listed, and no card names a food outside it), and how many cards to stop at
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<EntryCard[]>] best match first when searching; ingredients, compounds, then effects, by name
 */
export async function listEntries(search: { q?: string; kind?: EntryKind; type?: string; within?: Revealed; limit?: number }, q: Sql = sql): Promise<EntryCard[]> {
  const words = search.q?.trim() ?? "";
  const { within, limit } = search;
  const rows = await q<{ kind: EntryKind; slug: string; name: string; type: string | null; imageUrl: string | null; compoundClass: string | null; place: number }[]>`
    with entry as (${numberedEntries(q)}),
    scored as (
      select *, name ilike ${"%" + words + "%"} as contains, word_similarity(${words}::text, name) as score from entry
      where (${search.kind ?? null}::text is null or kind = ${search.kind ?? null})
        and (${search.type ?? null}::text is null or type = ${search.type ?? null})
        ${
          within
            ? q`and ((kind = 'ingredient' and slug = any(${[...within.foods]}::text[]))
                  or (kind = 'compound' and slug = any(${[...within.compounds]}::text[]))
                  or (kind = 'effect' and slug = any(${[...within.effects]}::text[])))`
            : q``
        }
    )
    select kind, slug, name, type, "imageUrl", "compoundClass", place from scored
    where ${words}::text = '' or contains
       or (not exists (select 1 from scored where contains) and score >= ${SEARCH_SIMILARITY})
    order by contains desc, name ilike ${words + "%"} desc,
             case when ${words}::text <> '' and name ilike ${words + "%"} then char_length(name) end, score desc,
             array_position(array['ingredient', 'compound', 'effect'], kind),
             case when ${words}::text = '' then 0 else char_length(name) end, name
    ${limit === undefined ? q`` : q`limit ${limit}`}`;

  const slugsOf = (kind: EntryKind) => rows.filter((r) => r.kind === kind).map((r) => r.slug);
  const foodSlugs = slugsOf("ingredient");
  const compoundStats = new Map(
    (
      await q<{ slug: string; carriers: number; foods: number; topName: string | null; topSlug: string | null }[]>`
        select c.slug, count(*) filter (where ic.compound_id is not null and ic.amount_per_100g is null)::int as carriers,
               count(*) filter (where ic.amount_per_100g > 0)::int as foods, top.name as "topName", top.slug as "topSlug"
        from compound c
        left join ingredient_compound ic on ic.compound_id = c.id
        left join lateral (
          select i.name, i.slug from ingredient_compound x join ingredient i on i.id = x.ingredient_id
          where x.compound_id = c.id and x.amount_per_100g = (${richestAmount(q, q`c.id`, q`y.amount_per_100g > 0`)})
          order by i.name limit 1
        ) top on true
        where c.slug = any(${slugsOf("compound")}::text[])
        group by c.id, top.name, top.slug`
    ).map((s) => [s.slug, s]),
  );
  const ingredientStats = new Map(
    (
      await q<{ slug: string; measured: number; topIn: string[] }[]>`
        select i.slug, count(ic.*) filter (where ic.amount_per_100g is not null)::int as measured,
               coalesce(array_agg(c.name order by c.name) filter (where ic.amount_per_100g > 0 and ic.amount_per_100g = (
                 select max(x.amount_per_100g) from ingredient_compound x where x.compound_id = ic.compound_id)), '{}') as "topIn"
        from ingredient i
        left join ingredient_compound ic on ic.ingredient_id = i.id
        left join compound c on c.id = ic.compound_id
        where i.slug = any(${foodSlugs}::text[])
        group by i.id`
    ).map((s) => [s.slug, s]),
  );
  const effectStats = new Map(
    (
      await q<{ slug: string; compounds: number }[]>`
        select e.slug, count(distinct ce.compound_id)::int as compounds from effect e left join compound_effect ce on ce.effect_id = e.id
        where e.slug = any(${slugsOf("effect")}::text[]) group by e.id`
    ).map((s) => [s.slug, s]),
  );
  const grades = await bestGrades(foodSlugs, q);

  return rows.map(({ place, ...r }): EntryCard => {
    const stats: string[] = [];
    if (r.kind === "ingredient") {
      const s = ingredientStats.get(r.slug)!;
      stats.push(`${s.measured} compounds measured`);
      if (s.topIn.length > 0) stats.push(`Most ${s.topIn.slice(0, 2).join(" and ")} in the Dex`);
    } else if (r.kind === "compound") {
      const s = compoundStats.get(r.slug)!;
      if (s.foods > 0) {
        stats.push(s.foods === 1 ? "In 1 food" : `In ${s.foods} foods`);
        if (!within || within.foods.has(s.topSlug!)) stats.push(`Most in ${s.topName}`);
      } else if (s.carriers > 0) {
        stats.push(`${s.carriers === 1 ? "In 1 food" : `In ${s.carriers} foods`}, no amount measured`);
      } else {
        stats.push("In no food in the Dex");
      }
    } else {
      const s = effectStats.get(r.slug)!;
      stats.push(s.compounds === 1 ? "1 compound" : `${s.compounds} compounds`);
    }
    return { ...r, number: dexNumber(r.kind, place), href: hrefOf(r.kind, r.slug), bestGrade: grades.get(`${r.kind}:${r.slug}`) ?? null, stats };
  });
}

/**
 * The foods matching what someone typed, leaving out what they already have.
 * @param words [string] what they typed
 * @param had [Set<string>] the slugs of foods already unlocked
 * @param max [number] how many to show
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<{ foods: EntryCard[]; more: boolean }>] the best matches, and whether others were left out
 */
export async function foodsMatching(words: string, had: Set<string>, max = FOODS_SHOWN, q: Sql = sql): Promise<{ foods: EntryCard[]; more: boolean }> {
  const found = (await listEntries({ q: words, kind: "ingredient", limit: max + had.size + 1 }, q)).filter((c) => !had.has(c.slug));
  return { foods: found.slice(0, max), more: found.length > max };
}

/**
 * The distinct type badges of each entry kind, for the home filters.
 * @param q [Sql] the connection or transaction to read through
 * @return [Promise<Record<EntryKind, string[]>>] categories, compound classes and body systems
 */
export async function entryTypes(q: Sql = sql): Promise<Record<EntryKind, string[]>> {
  const rows = await q<{ kind: EntryKind; types: string[] }[]>`
    select 'ingredient' as kind, array_agg(distinct category order by category) filter (where category is not null) as types from ingredient
    union all select 'compound', array_agg(distinct class order by class) filter (where class is not null) from compound
    union all select 'effect', array_agg(distinct body_system order by body_system) filter (where body_system is not null) from effect`;
  return Object.fromEntries(rows.map((r) => [r.kind, r.types ?? []])) as Record<EntryKind, string[]>;
}

/**
 * Sources, with what each supports.
 * @param q [Sql] the connection or transaction to read through
 * @param only [string[]] the ids to list; every source when left out
 * @return [Promise<SourceUse[]>] studies first, then databases; newest first within each
 */
export async function sourceList(q: Sql = sql, only?: string[]): Promise<SourceUse[]> {
  const rows = await q<(SourceUse & { amounts: string[]; modifiers: string[]; prep: string[]; effects: string[]; classes: string[] })[]>`
    select s.id, s.title, s.url, s.year, s.study_type as "studyType", s.limitations, s.doi, s.pmid, s.population,
      coalesce((select array_agg(distinct i.name) from ingredient_compound ic join ingredient i on i.id = ic.ingredient_id where ic.source_id = s.id), '{}') as amounts,
      coalesce((select array_agg(distinct coalesce(c.name, k.name)) from absorption_modifier am
                left join compound c on c.id = am.target_compound_id left join compound_class k on k.id = am.target_class_id
                where am.source_id = s.id), '{}') as modifiers,
      coalesce((select array_agg(distinct c.name || ', ' || p.prep_method) from prep_effect p join compound c on c.id = p.compound_id where p.source_id = s.id), '{}') as prep,
      coalesce((select array_agg(distinct c.name || ' → ' || e.name) from compound_effect ce join compound c on c.id = ce.compound_id join effect e on e.id = ce.effect_id where ce.source_id = s.id), '{}') as effects,
      coalesce((select array_agg(distinct k.name) from compound_class k where k.source_id = s.id), '{}') as classes
    from source s
    ${only ? q`where s.id = any(${only}::uuid[])` : q``}
    order by (s.study_type = 'database'), s.year desc nulls last, s.title`;
  return rows.map(({ amounts, modifiers, prep, effects, classes, ...s }) => ({
    ...s,
    supports: [
      ...(amounts.length ? [`Amounts per 100 g for ${amounts.join(", ")}`] : []),
      ...modifiers.map((m) => `Absorption rule on ${m}`),
      ...prep.map((p) => `Prep effect: ${p}`),
      ...effects.map((e) => `Effect: ${e}`),
      ...classes.map((k) => `ChEBI class: ${k}`),
    ],
  }));
}

/** @return [string] the Dex path of an entry */
export function hrefOf(kind: EntryKind, slug: string): string {
  return `/${kind === "ingredient" ? "ingredients" : kind === "compound" ? "compounds" : "effects"}/${slug}`;
}

async function foodsCarrying(compoundId: string, q: Sql): Promise<{ ranked: FoodAmount[]; absent: Absences }> {
  const rows = await q<{ slug: string; name: string; imageUrl: string | null; amount: string | null; unit: Unit | null; servingG: string | null }[]>`
    select i.slug, i.name, i.image_url as "imageUrl", ic.amount_per_100g as amount, ic.unit, i.typical_serving_g as "servingG"
    from ingredient_compound ic join ingredient i on i.id = ic.ingredient_id
    where ic.compound_id = ${compoundId}
    order by ic.amount_per_100g desc nulls last, i.name`;
  const measured = rows.filter((r) => r.amount !== null && Number(r.amount) > 0);
  const top = measured.length > 0 ? Number(measured[0].amount) : 0;
  return {
    ranked: measured.map((r) => ({
      slug: r.slug,
      name: r.name,
      imageUrl: r.imageUrl,
      amount: Number(r.amount),
      unit: r.unit!,
      perServing: r.servingG === null ? null : (Number(r.amount) * Number(r.servingG)) / 100,
      share: Number(r.amount) / top,
    })),
    absent: {
      none: rows.filter((r) => r.amount !== null && Number(r.amount) === 0).map(named),
      unmeasured: rows.filter((r) => r.amount === null).map(named),
    },
  };
}

async function effectClaims(by: { compounds: string[] } | { effect: string }, q: Sql): Promise<EffectClaim[]> {
  const compounds = "compounds" in by ? by.compounds : null;
  const effectSlug = "effect" in by ? by.effect : null;
  const rows = await q<{ effectSlug: string; effectName: string; direction: string; bodySystem: string | null; compoundSlug: string; compoundName: string; compoundClass: string | null; summary: string | null; doseContext: string | null; onset: string | null; minFoodPer100g: string | null; grade: Grade; sourceId: string }[]>`
    select e.slug as "effectSlug", e.name as "effectName", e.direction, e.body_system as "bodySystem",
           c.slug as "compoundSlug", c.name as "compoundName", c.class as "compoundClass",
           ce.summary, ce.dose_context as "doseContext", ce.onset, ce.min_food_per_100g as "minFoodPer100g", ce.evidence_grade as grade, ce.source_id as "sourceId"
    from compound_effect ce join effect e on e.id = ce.effect_id join compound c on c.id = ce.compound_id
    where (${compounds}::text[] is null or c.slug = any(${compounds}::text[]))
      and (${effectSlug}::text is null or e.slug = ${effectSlug})
    order by ce.evidence_grade, e.name, c.name`;
  const refs = await sourceMap(rows.map((r) => r.sourceId), q);
  return rows.map((r) => ({
    effect: { slug: r.effectSlug, name: r.effectName, direction: r.direction, bodySystem: r.bodySystem },
    compound: { slug: r.compoundSlug, name: r.compoundName, class: r.compoundClass },
    summary: r.summary,
    doseContext: r.doseContext,
    onset: r.onset,
    minFoodPer100g: r.minFoodPer100g === null ? null : Number(r.minFoodPer100g),
    grade: r.grade,
    source: refs.get(r.sourceId)!,
  }));
}

async function prepClaims(compoundSlugs: string[], q: Sql): Promise<PrepClaim[]> {
  const rows = await q<{ slug: string; name: string; method: string; retentionFactor: string | null; direction: string | null; note: string | null; sourceId: string }[]>`
    select c.slug, c.name, p.prep_method as method, p.retention_factor as "retentionFactor", p.direction,
           p.bioavailability_note as note, p.source_id as "sourceId"
    from prep_effect p join compound c on c.id = p.compound_id
    where c.slug = any(${compoundSlugs})
    order by p.prep_method, c.name`;
  const refs = await sourceMap(rows.map((r) => r.sourceId), q);
  return rows.map((r) => ({
    compound: { slug: r.slug, name: r.name },
    method: r.method,
    retentionFactor: r.retentionFactor === null ? null : Number(r.retentionFactor),
    direction: r.direction,
    note: r.note,
    source: refs.get(r.sourceId)!,
  }));
}

async function rulesById(ids: string[], q: Sql): Promise<Map<string, { className: string | null; source: SourceRef }>> {
  const rows = await q<{ id: string; className: string | null; sourceId: string }[]>`
    select am.id, k.name as "className", am.source_id as "sourceId"
    from absorption_modifier am left join compound_class k on k.id = am.target_class_id
    where am.id = any(${ids}::uuid[])`;
  const refs = await sourceMap(rows.map((r) => r.sourceId), q);
  return new Map(rows.map((r) => [r.id, { className: r.className, source: refs.get(r.sourceId)! }]));
}

async function sourcesByIds(ids: string[], q: Sql): Promise<SourceRef[]> {
  return [
    ...(await q<SourceRef[]>`
      select id, title, url, year, study_type as "studyType", limitations from source
      where id = any(${ids}::uuid[]) order by title`),
  ];
}

async function sourceMap(ids: string[], q: Sql): Promise<Map<string, SourceRef>> {
  return new Map((await sourcesByIds([...new Set(ids)], q)).map((s) => [s.id, s]));
}

// Each food's facts are read through its own rows (the lateral join), so a short list never reads every food's amounts.
async function bestGrades(foodSlugs: string[], q: Sql): Promise<Map<string, Grade>> {
  const rows = await q<{ key: string; grade: Grade }[]>`
    with fact_grade as (
      select compound_id, evidence_grade as grade from absorption_modifier_applied
      union all select compound_id, evidence_grade from caution where compound_id is not null
    ),
    compound_grade as (
      select compound_id, min(grade) as grade from (
        select compound_id, evidence_grade as grade from compound_effect
        union all select compound_id, grade from fact_grade
      ) g group by compound_id
    )
    select 'compound:' || c.slug as key, cg.grade from compound_grade cg join compound c on c.id = cg.compound_id
    union all
    select 'ingredient:' || i.slug, min(g.grade) from ingredient i join lateral (
      select ce.evidence_grade as grade from ingredient_compound ic join compound_effect ce on ce.compound_id = ic.compound_id
      where ic.ingredient_id = i.id and ic.amount_per_100g > 0 and ic.amount_per_100g >= coalesce(ce.min_food_per_100g, 0) and ${mayBearClaims(q)}
      union all select f.grade from ingredient_compound ic join fact_grade f on f.compound_id = ic.compound_id
      where ic.ingredient_id = i.id and ic.amount_per_100g > 0
      union all select evidence_grade from caution where ingredient_id = i.id
    ) g on true where i.slug = any(${foodSlugs}::text[]) group by i.slug
    union all
    select 'effect:' || e.slug, min(ce.evidence_grade) from effect e join compound_effect ce on ce.effect_id = e.id group by e.slug`;
  return new Map(rows.map((r) => [r.key, r.grade]));
}

function named(r: { slug: string; name: string }): Named {
  return { slug: r.slug, name: r.name };
}

function dedupe(sources: SourceRef[]): SourceRef[] {
  return [...new Map(sources.map((s) => [s.id, s])).values()].sort((a, b) => a.title.localeCompare(b.title));
}

function best(grades: Grade[]): Grade | null {
  return grades.length === 0 ? null : grades.reduce((a, b) => (b < a ? b : a));
}
