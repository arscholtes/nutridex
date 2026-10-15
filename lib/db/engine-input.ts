// Reads a recipe and every fact the engine needs from the database, as the engine's plain input.
// Refuses a fact the plan forbids: an effect, modifier or caution without a source and a grade.
import { sql } from "./client.ts";
import type {
  CautionFact,
  CompoundEffectFact,
  Facts,
  Grade,
  MassUnit,
  MicrobeMetaboliteFact,
  MicrobeSubstrateFact,
  ModifierFact,
  PrepDirection,
  PrepEffectFact,
  RecipeInput,
  UpperLimitFact,
} from "codon";

/**
 * Load a recipe with its ingredients (in position order) and steps.
 * @param slug [string] the recipe's slug
 * @return [Promise<RecipeInput>] the recipe as the engine reads it
 * @throws when no recipe has that slug
 */
export async function loadRecipe(slug: string): Promise<RecipeInput> {
  const [recipe] = await sql<{ id: string; servings: number }[]>`select id, servings from recipe where slug = ${slug}`;
  if (!recipe) throw new Error(`no recipe with slug "${slug}"`);
  const ingredients = await sql<{ id: string; ingredientSlug: string; grams: string; prepMethod: string }[]>`
    select ri.id, i.slug as "ingredientSlug", ri.grams, ri.prep_method as "prepMethod"
    from recipe_ingredient ri join ingredient i on i.id = ri.ingredient_id
    where ri.recipe_id = ${recipe.id}
    order by ri.position`;
  const steps = await sql<{ position: number; prepMethod: string | null; recipeIngredientIds: string[] }[]>`
    select s.position, s.prep_method as "prepMethod",
           coalesce(array_agg(si.recipe_ingredient_id) filter (where si.recipe_ingredient_id is not null), '{}') as "recipeIngredientIds"
    from recipe_step s left join recipe_step_ingredient si on si.step_id = s.id
    where s.recipe_id = ${recipe.id}
    group by s.id
    order by s.position`;
  return {
    slug,
    servings: recipe.servings,
    ingredients: ingredients.map((ri) => ({ ...ri, grams: Number(ri.grams) })),
    steps: [...steps],
  };
}

/**
 * Load every fact about some ingredients and the compounds they carry.
 * @param ingredientSlugs [string[]] the ingredients in play
 * @return [Promise<Facts>] amounts, prep effects, modifiers, cautions, effects, upper limits, microbes
 * @throws when a fact lacks the source or grade the plan requires, or carries an unknown unit
 */
export async function loadFacts(ingredientSlugs: string[]): Promise<Facts> {
  const amounts = await sql<{ ingredientSlug: string; compoundSlug: string; amountPer100g: string | null; unit: string | null; amountLow: string | null; amountHigh: string | null }[]>`
    select i.slug as "ingredientSlug", c.slug as "compoundSlug", ic.amount_per_100g as "amountPer100g", ic.unit,
           ic.amount_low as "amountLow", ic.amount_high as "amountHigh"
    from ingredient_compound ic
    join ingredient i on i.id = ic.ingredient_id
    join compound c on c.id = ic.compound_id
    where i.slug = any(${ingredientSlugs})
    order by i.slug, c.slug`;
  const compoundSlugs = [...new Set(amounts.map((a) => a.compoundSlug))];

  const prepEffects = await sql<{ compoundSlug: string; prepMethod: string; retentionFactor: string | null; direction: string | null; note: string | null; sourceId: string | null }[]>`
    select c.slug as "compoundSlug", p.prep_method as "prepMethod", p.retention_factor as "retentionFactor",
           p.direction, p.bioavailability_note as note, p.source_id as "sourceId"
    from prep_effect p join compound c on c.id = p.compound_id
    where c.slug = any(${compoundSlugs})`;

  // Modifiers come applied: a class rule arrives once per compound it reaches, with its basis.
  const modifiers = await sql<{ targetCompoundSlug: string; modifierCompoundSlug: string | null; condition: string | null; direction: string; magnitude: string | null; mechanism: string | null; grade: string | null; sourceId: string | null; modifierFoundIn: string[]; basis: string }[]>`
    select t.slug as "targetCompoundSlug", m.slug as "modifierCompoundSlug", am.modifier_condition as condition,
           am.direction, am.magnitude, am.mechanism, am.evidence_grade as grade, am.source_id as "sourceId", am.basis,
           coalesce((select array_agg(i.name order by i.name) from ingredient_compound ic join ingredient i on i.id = ic.ingredient_id
                     where ic.compound_id = am.modifier_compound_id), '{}') as "modifierFoundIn"
    from absorption_modifier_applied am
    join compound t on t.id = am.compound_id
    left join compound m on m.id = am.modifier_compound_id
    where t.slug = any(${compoundSlugs})`;

  const cautions = await sql<{ compoundSlug: string | null; ingredientSlug: string | null; kind: string; summary: string; grade: string | null; sourceId: string | null }[]>`
    select c.slug as "compoundSlug", i.slug as "ingredientSlug", k.kind, k.summary, k.evidence_grade as grade, k.source_id as "sourceId"
    from caution k
    left join compound c on c.id = k.compound_id
    left join ingredient i on i.id = k.ingredient_id
    where c.slug = any(${compoundSlugs}) or i.slug = any(${ingredientSlugs})`;

  const compoundEffects = await sql<{ compoundSlug: string; effectSlug: string; direction: string; onset: string | null; grade: string | null; sourceId: string | null }[]>`
    select c.slug as "compoundSlug", e.slug as "effectSlug", e.direction, ce.onset, ce.evidence_grade as grade, ce.source_id as "sourceId"
    from compound_effect ce
    join compound c on c.id = ce.compound_id
    join effect e on e.id = ce.effect_id
    where c.slug = any(${compoundSlugs})`;

  const upperLimits = await sql<{ compoundSlug: string; amount: string; unit: string }[]>`
    select slug as "compoundSlug", upper_limit_amount as amount, upper_limit_unit as unit
    from compound where slug = any(${compoundSlugs}) and upper_limit_amount is not null`;

  const microbeSubstrates = await sql<{ microbeSlug: string; compoundSlug: string; relationship: string; grade: string | null; sourceId: string | null }[]>`
    select m.slug as "microbeSlug", c.slug as "compoundSlug", ms.relationship, ms.evidence_grade as grade, ms.source_id as "sourceId"
    from microbe_substrate ms
    join microbe m on m.id = ms.microbe_id
    join compound c on c.id = ms.compound_id
    where c.slug = any(${compoundSlugs})`;

  const microbeMetabolites = await sql<{ microbeSlug: string; substrateCompoundSlug: string | null; productCompoundSlug: string; grade: string | null; sourceId: string | null }[]>`
    select m.slug as "microbeSlug", s.slug as "substrateCompoundSlug", p.slug as "productCompoundSlug",
           mm.evidence_grade as grade, mm.source_id as "sourceId"
    from microbe_metabolite mm
    join microbe m on m.id = mm.microbe_id
    left join compound s on s.id = mm.substrate_compound_id
    join compound p on p.id = mm.product_compound_id
    where m.slug = any(${[...new Set(microbeSubstrates.map((r) => r.microbeSlug))]})`;

  return {
    amounts: amounts.map((a) => ({
      ...a,
      amountPer100g: numberOrNull(a.amountPer100g),
      unit: a.unit === null ? null : massUnit(a.unit, `${a.ingredientSlug} · ${a.compoundSlug}`),
      amountLow: numberOrNull(a.amountLow),
      amountHigh: numberOrNull(a.amountHigh),
    })),
    prepEffects: prepEffects.map((p): PrepEffectFact => {
      const where = `prep_effect ${p.compoundSlug} · ${p.prepMethod}`;
      sourced(p.sourceId, where);
      return { compoundSlug: p.compoundSlug, prepMethod: p.prepMethod, retentionFactor: numberOrNull(p.retentionFactor), direction: p.direction as PrepDirection | null, note: p.note };
    }),
    modifiers: modifiers.map((m): ModifierFact => {
      const where = `absorption_modifier on ${m.targetCompoundSlug}`;
      return {
        targetCompoundSlug: m.targetCompoundSlug,
        modifierCompoundSlug: m.modifierCompoundSlug,
        condition: m.condition,
        direction: oneOf(m.direction, ["enhances", "inhibits"] as const, where),
        magnitude: m.magnitude,
        mechanism: m.mechanism,
        grade: graded(m.grade, m.sourceId, where),
        modifierFoundIn: m.modifierFoundIn,
        basis: oneOf(m.basis, ["measured", "by-class"] as const, where),
      };
    }),
    cautions: cautions.map((k): CautionFact => ({
      compoundSlug: k.compoundSlug,
      ingredientSlug: k.ingredientSlug,
      kind: k.kind,
      summary: k.summary,
      grade: graded(k.grade, k.sourceId, `caution "${k.summary}"`),
    })),
    compoundEffects: compoundEffects.map((e): CompoundEffectFact => {
      const where = `compound_effect ${e.compoundSlug} → ${e.effectSlug}`;
      return {
        compoundSlug: e.compoundSlug,
        effectSlug: e.effectSlug,
        direction: oneOf(e.direction, ["benefit", "risk", "neutral"] as const, where),
        onset: e.onset,
        grade: graded(e.grade, e.sourceId, where),
      };
    }),
    upperLimits: upperLimits.map((l): UpperLimitFact => ({ compoundSlug: l.compoundSlug, amount: Number(l.amount), unit: massUnit(l.unit, `upper limit of ${l.compoundSlug}`) })),
    microbeSubstrates: microbeSubstrates.map((r): MicrobeSubstrateFact => {
      const where = `microbe_substrate ${r.microbeSlug} · ${r.compoundSlug}`;
      return {
        microbeSlug: r.microbeSlug,
        compoundSlug: r.compoundSlug,
        relationship: oneOf(r.relationship, ["ferments", "promoted-by", "inhibited-by"] as const, where),
        grade: graded(r.grade, r.sourceId, where),
      };
    }),
    microbeMetabolites: microbeMetabolites.map((r): MicrobeMetaboliteFact => ({
      microbeSlug: r.microbeSlug,
      substrateCompoundSlug: r.substrateCompoundSlug,
      productCompoundSlug: r.productCompoundSlug,
      grade: graded(r.grade, r.sourceId, `microbe_metabolite ${r.microbeSlug} → ${r.productCompoundSlug}`),
    })),
  };
}

function numberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function massUnit(unit: string, where: string): MassUnit {
  return oneOf(unit, ["g", "mg", "µg"] as const, where);
}

function oneOf<T extends string>(value: string, allowed: readonly T[], where: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${where}: "${value}" is not one of ${allowed.join(", ")}`);
  return value as T;
}

function sourced(sourceId: string | null, where: string): void {
  if (sourceId === null) throw new Error(`${where} has no source`);
}

function graded(grade: string | null, sourceId: string | null, where: string): Grade {
  sourced(sourceId, where);
  if (grade === null) throw new Error(`${where} has no evidence grade`);
  return grade as Grade;
}
