// Recipes someone builds. Every platform saves through saveRecipe, which refuses what the engine could not
// read and any food not yet encountered, so a recipe never names something its builder has not unlocked.
import { DEFAULT_SETTINGS, PREP_METHODS, recipeProfile, type RecipeInput, type RecipeProfile } from "epistasis";
import { recipeGrid, type RecipeGrid } from "../recipe-grid.ts";
import { sql } from "./client.ts";
import { PANEL } from "../usda/nutrients.ts";
import { absorptionTips, type AbsorptionTip, type PanelRow } from "./dex.ts";
import { encounteredFoods } from "./encounters.ts";
import { loadFacts, loadRecipe } from "./engine-input.ts";

type Sql = typeof sql;

export type RecipeDraft = {
  name: string;
  servings: number;
  ingredients: { food: string; grams: number; prepMethod: string }[];
  /** `uses` holds indexes into `ingredients`. */
  steps: { title: string; prepMethod: string | null; uses: number[] }[];
};

export type RecipeSummary = { slug: string; name: string; servings: number; ingredients: number };

export type RecipePage = {
  slug: string;
  name: string;
  servings: number;
  /** The one piece of data the grid and the profile are both drawn from. */
  recipe: RecipeInput;
  grid: RecipeGrid;
  profile: RecipeProfile;
  absorption: AbsorptionTip[];
  /** The headline nutrients every food's page shows, per serving here. */
  panel: PanelRow[];
  stepTitles: Record<number, string>;
  foodNames: Record<string, string>;
  compoundNames: Record<string, string>;
  effectNames: Record<string, string>;
};

/**
 * A saved recipe as its page shows it: the grid and the profile, both from one loaded RecipeInput.
 * Shows every recipe; a screen that must hide locked foods checks them itself.
 * @param slug [string] the recipe's slug
 * @return [Promise<RecipePage | null>] null when no recipe has that slug
 */
export async function recipePage(slug: string, q: Sql = sql): Promise<RecipePage | null> {
  const [row] = await q<{ id: string; name: string; servings: number }[]>`select id, name, servings from recipe where slug = ${slug}`;
  if (!row) return null;
  const titles = await q<{ position: number; title: string | null }[]>`select position, title from recipe_step where recipe_id = ${row.id}`;
  const stepTitles = Object.fromEntries(titles.map((t) => [t.position, t.title ?? `Step ${t.position}`]));
  return pageOf({ slug, name: row.name, servings: row.servings }, await loadRecipe(slug, q), stepTitles, q);
}

/**
 * A recipe still being built, as its page would show it once saved: the builder's live preview.
 * @param draft [RecipeDraft] what is built so far
 * @param available [Set<string>] the foods this builder may use
 * @return [Promise<RecipePage | { problems: string[] }>] the preview, or why there is none yet
 */
export async function draftPage(draft: RecipeDraft, available: Set<string>, q: Sql = sql): Promise<RecipePage | { problems: string[] }> {
  const foods = draft.ingredients.map((i) => i.food);
  const rows = await q<{ id: string; slug: string; retentionFamily: string | null }[]>`
    select id, slug, retention_family as "retentionFamily" from ingredient where slug = any(${foods})`;
  // Naming the recipe comes last when building it, so the preview does not wait for it.
  const problems = problemsIn({ ...draft, name: draft.name.trim() || "Untitled" }, new Map(rows.map((r) => [r.slug, r.id])), available);
  if (problems.length > 0) return { problems };
  const family = new Map(rows.map((r) => [r.slug, r.retentionFamily]));
  const recipe: RecipeInput = {
    slug: "draft",
    servings: draft.servings,
    ingredients: draft.ingredients.map((i, n) => ({ id: `draft-${n}`, ingredientSlug: i.food, grams: i.grams, prepMethod: i.prepMethod, retentionFamily: family.get(i.food)! })),
    steps: draft.steps.map((s, n) => ({ position: n + 1, prepMethod: s.prepMethod, recipeIngredientIds: [...new Set(s.uses)].map((u) => `draft-${u}`) })),
  };
  const stepTitles = Object.fromEntries(draft.steps.map((s, n) => [n + 1, s.title.trim() || `Step ${n + 1}`]));
  return pageOf({ slug: "draft", name: draft.name.trim() || "Untitled recipe", servings: draft.servings }, recipe, stepTitles, q);
}

async function pageOf(meta: { slug: string; name: string; servings: number }, recipe: RecipeInput, stepTitles: Record<number, string>, q: Sql): Promise<RecipePage> {
  const profile = await profileOf(recipe, q);
  const named = await namesFor(recipe, profile, q);
  return {
    ...meta,
    recipe,
    grid: recipeGrid(recipe),
    profile,
    absorption: await absorptionTips(profile.absorption, new Map(Object.entries(named.compoundNames)), q),
    panel: PANEL.map((p) => {
      const total = profile.perServing.find((t) => t.compoundSlug === p.slug);
      return { slug: p.slug, name: named.compoundNames[p.slug], group: p.group, amount: total?.amount ?? null, unit: total?.unit ?? null, share: null };
    }),
    stepTitles,
    ...named,
  };
}

/**
 * The engine's profile of a recipe, with a goal score for every effect it reaches: nobody has picked
 * goals yet, so each effect is scored and the scores compare recipes rather than stand alone.
 * @param recipe [RecipeInput] saved or still being built
 * @return [Promise<RecipeProfile>]
 */
export async function profileOf(recipe: RecipeInput, q: Sql = sql): Promise<RecipeProfile> {
  const facts = await loadFacts(recipe.ingredients.map((i) => i.ingredientSlug), q);
  const reached = recipeProfile(recipe, facts, DEFAULT_SETTINGS, []).effects.map((e) => e.effectSlug);
  return recipeProfile(recipe, facts, DEFAULT_SETTINGS, reached);
}

async function namesFor(recipe: RecipeInput, profile: RecipeProfile, q: Sql) {
  const foods = recipe.ingredients.map((i) => i.ingredientSlug);
  const compounds = [
    ...PANEL.map((p) => p.slug),
    ...profile.perServing.map((t) => t.compoundSlug),
    ...profile.absorption.map((f) => f.compoundSlug),
    ...profile.prep.map((p) => p.compoundSlug),
    ...profile.cautions.flatMap((c) => (c.compoundSlug ? [c.compoundSlug] : [])),
    ...profile.effects.flatMap((e) => e.compounds),
  ];
  const effects = profile.effects.map((e) => e.effectSlug);
  const pairs = (rows: { slug: string; name: string }[]) => Object.fromEntries(rows.map((r) => [r.slug, r.name]));
  return {
    foodNames: pairs(await q<{ slug: string; name: string }[]>`select slug, name from ingredient where slug = any(${foods})`),
    compoundNames: pairs(await q<{ slug: string; name: string }[]>`select slug, name from compound where slug = any(${compounds})`),
    effectNames: pairs(await q<{ slug: string; name: string }[]>`select slug, name from effect where slug = any(${effects})`),
  };
}

/** A draft that cannot be saved, with every reason at once. */
export class InvalidRecipe extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`recipe refused: ${problems.join("; ")}`);
    this.problems = problems;
  }
}

const PREPS = new Set<string>(PREP_METHODS);

/**
 * Save a recipe built on any platform.
 * @param draft [RecipeDraft] what was built
 * @param available [Set<string>] the foods the builder could offer: the viewer's revealed foods on the web, the uploaded record for the apps
 * @param q [Sql] the connection or transaction to write through
 * @return [Promise<string>] the new recipe's slug
 * @raise [InvalidRecipe] naming every problem, before anything is written
 */
export async function saveRecipe(draft: RecipeDraft, available: Set<string>, q: Sql = sql): Promise<string> {
  const foods = draft.ingredients.map((i) => i.food);
  const known = new Map((await q<{ id: string; slug: string }[]>`select id, slug from ingredient where slug = any(${foods})`).map((r) => [r.slug, r.id]));
  const problems = problemsIn(draft, known, available);
  if (problems.length > 0) throw new InvalidRecipe(problems);

  const write = async (tx: Sql): Promise<string> => {
    const slug = await freeSlug(slugOf(draft.name), tx);
    const [{ id: recipeId }] = await tx<{ id: string }[]>`
      insert into recipe (slug, name, servings) values (${slug}, ${draft.name.trim()}, ${draft.servings}) returning id`;
    const ingredientIds: string[] = [];
    for (const [position, i] of draft.ingredients.entries()) {
      const [{ id }] = await tx<{ id: string }[]>`
        insert into recipe_ingredient (recipe_id, ingredient_id, grams, prep_method, position)
        values (${recipeId}, ${known.get(i.food)!}, ${i.grams}, ${i.prepMethod}, ${position}) returning id`;
      ingredientIds.push(id);
    }
    for (const [index, s] of draft.steps.entries()) {
      const [{ id: stepId }] = await tx<{ id: string }[]>`
        insert into recipe_step (recipe_id, position, title, prep_method)
        values (${recipeId}, ${index + 1}, ${s.title.trim()}, ${s.prepMethod}) returning id`;
      for (const use of new Set(s.uses)) {
        await tx`insert into recipe_step_ingredient (step_id, recipe_ingredient_id) values (${stepId}, ${ingredientIds[use]})`;
      }
    }
    return slug;
  };
  // A caller's transaction already makes the writes one; on the shared connection they get their own.
  return q === sql ? sql.begin((tx) => write(tx as unknown as Sql)) : write(q);
}

/**
 * Recipes made only of foods in `visible`: on the web, iPhone and iPad nothing locked may show.
 * @param visible [Set<string>] the food slugs this viewer may see
 * @return [Promise<RecipeSummary[]>] by name
 */
export async function listRecipes(visible: Set<string>, q: Sql = sql): Promise<RecipeSummary[]> {
  return q<RecipeSummary[]>`
    select r.slug, r.name, r.servings, count(ri.id)::int as ingredients
    from recipe r join recipe_ingredient ri on ri.recipe_id = r.id join ingredient i on i.id = ri.ingredient_id
    group by r.id
    having bool_and(i.slug = any(${[...visible]}))
    order by r.name`;
}

/** @return [Promise<Set<string>>] the uploaded record, which is what the apps may use */
export async function uploadedFoods(q: Sql = sql): Promise<Set<string>> {
  return new Set(await encounteredFoods(q));
}

function problemsIn(draft: RecipeDraft, known: Map<string, string>, encountered: Set<string>): string[] {
  const problems: string[] = [];
  if (draft.name.trim() === "") problems.push("a recipe needs a name");
  if (!Number.isInteger(draft.servings) || draft.servings < 1) problems.push("servings must be a whole number of at least 1");
  if (draft.ingredients.length === 0) problems.push("a recipe needs at least one ingredient");
  for (const [index, i] of draft.ingredients.entries()) {
    const n = index + 1;
    if (!known.has(i.food)) problems.push(`ingredient ${n}: there is no food "${i.food}"`);
    else if (!encountered.has(i.food)) problems.push(`ingredient ${n}: ${i.food} has not been encountered yet`);
    if (!(Number.isFinite(i.grams) && i.grams > 0)) problems.push(`ingredient ${n}: grams must be more than 0`);
    if (!PREPS.has(i.prepMethod)) problems.push(`ingredient ${n}: "${i.prepMethod}" is not a prep method the engine knows`);
  }
  for (const [index, s] of draft.steps.entries()) {
    const n = index + 1;
    if (s.title.trim() === "") problems.push(`step ${n} needs a title`);
    if (s.prepMethod !== null && !PREPS.has(s.prepMethod)) problems.push(`step ${n}: "${s.prepMethod}" is not a prep method the engine knows`);
    for (const use of s.uses) {
      if (!(Number.isInteger(use) && use >= 0 && use < draft.ingredients.length)) {
        problems.push(`step ${n} uses ingredient ${use + 1}, which is not in the recipe`);
      }
    }
  }
  return problems;
}

function slugOf(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "recipe";
}

/** The slug itself when free, else the first numbered one that is: chosen before writing, so nothing collides. */
async function freeSlug(base: string, q: Sql): Promise<string> {
  const taken = new Set((await q<{ slug: string }[]>`select slug from recipe where slug = ${base} or slug like ${`${base}-%`}`).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** @return [Promise<{ slug: string; name: string }[]>] those foods by name, for the builder to offer */
export async function namedFoods(slugs: Set<string>, q: Sql = sql): Promise<{ slug: string; name: string }[]> {
  return q<{ slug: string; name: string }[]>`select slug, name from ingredient where slug = any(${[...slugs]}) order by name`;
}
