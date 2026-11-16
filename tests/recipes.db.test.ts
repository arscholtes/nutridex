// Recipes someone builds: one writer for every platform, and listed only when nothing in them is still locked.
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { loadRecipe } from "../lib/db/engine-input.ts";
import { encounteredFoods, recordEncounters } from "../lib/db/encounters.ts";
import { eraseOwner, ownerRecord } from "../lib/db/sessions.ts";
import { deleteRecipe, draftPage, InvalidRecipe, listRecipes, recipePage, saveRecipe, type RecipeDraft } from "../lib/db/recipes.ts";
import { inRolledBackTransaction } from "./helpers/db.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the recipes test writes to the database");
afterAll(() => sql.end());

const AT = "2026-11-09T12:00:00.000Z";
const encounter = (tx: typeof sql, foods: string[]) => recordEncounters(foods.map((food) => ({ food, encounteredAt: AT })), null, tx);
const uploadedFoods = async (tx: typeof sql) => new Set(await encounteredFoods(null, tx));

const DRAFT: RecipeDraft = {
  name: "Carrot and kale with oil",
  servings: 2,
  ingredients: [
    { food: "carrot", grams: 122, prepMethod: "raw" },
    { food: "kale", grams: 42, prepMethod: "raw" },
    { food: "olive-oil", grams: 14, prepMethod: "raw" },
  ],
  steps: [
    { title: "Steam the vegetables", prepMethod: "steamed", uses: [0, 1] },
    { title: "Dress with oil", prepMethod: null, uses: [0, 1, 2] },
  ],
};

describe("saving a recipe", () => {
  test("what was built is what loads back, steps and all", async () => {
    await inRolledBackTransaction(async (tx) => {
      await encounter(tx, ["carrot", "kale", "olive-oil"]);
      const slug = await saveRecipe(DRAFT, await uploadedFoods(tx), null, tx);
      expect(slug).toBe("carrot-and-kale-with-oil");

      const loaded = await loadRecipe(slug, tx);
      expect(loaded.servings).toBe(2);
      expect(loaded.ingredients.map((i) => [i.ingredientSlug, i.grams, i.prepMethod])).toEqual([
        ["carrot", 122, "raw"], ["kale", 42, "raw"], ["olive-oil", 14, "raw"],
      ]);
      const slugOf = new Map(loaded.ingredients.map((i) => [i.id, i.ingredientSlug]));
      expect(loaded.steps.map((s) => [s.position, s.prepMethod, s.recipeIngredientIds.map((id) => slugOf.get(id)).sort()])).toEqual([
        [1, "steamed", ["carrot", "kale"]],
        [2, null, ["carrot", "kale", "olive-oil"]],
      ]);
    });
  });

  test("a second recipe with the same name gets a slug of its own", async () => {
    await inRolledBackTransaction(async (tx) => {
      await encounter(tx, ["carrot", "kale", "olive-oil"]);
      expect(await saveRecipe(DRAFT, await uploadedFoods(tx), null, tx)).toBe("carrot-and-kale-with-oil");
      expect(await saveRecipe(DRAFT, await uploadedFoods(tx), null, tx)).toBe("carrot-and-kale-with-oil-2");
    });
  });

  test("a food not yet encountered is refused, by name, and nothing is written", async () => {
    await inRolledBackTransaction(async (tx) => {
      await encounter(tx, ["carrot", "kale"]);
      const before = await tx`select count(*)::int as n from recipe`;
      await expect(saveRecipe(DRAFT, await uploadedFoods(tx), null, tx)).rejects.toThrow(InvalidRecipe);
      await expect(saveRecipe(DRAFT, await uploadedFoods(tx), null, tx)).rejects.toThrow(/olive-oil/);
      expect(await tx`select count(*)::int as n from recipe`).toEqual(before);
    });
  });

  test("everything the engine could not read is refused, each problem named", async () => {
    await inRolledBackTransaction(async (tx) => {
      await encounter(tx, ["carrot"]);
      const bad: RecipeDraft = {
        name: "  ",
        servings: 0,
        ingredients: [{ food: "carrot", grams: 0, prepMethod: "microwaved" }],
        steps: [{ title: "Mix", prepMethod: "shaken", uses: [3] }],
      };
      const problems = await saveRecipe(bad, await uploadedFoods(tx), null, tx).then(() => [], (e: InvalidRecipe) => e.problems);
      expect(problems).toEqual(expect.arrayContaining([
        expect.stringMatching(/name/),
        expect.stringMatching(/servings/),
        expect.stringMatching(/grams/),
        expect.stringMatching(/microwaved/),
        expect.stringMatching(/shaken/),
        expect.stringMatching(/step 1.*ingredient 4/),
      ]));
    });
  });

  test("a recipe needs at least one ingredient", async () => {
    await inRolledBackTransaction(async (tx) => {
      await expect(saveRecipe({ name: "Water", servings: 1, ingredients: [], steps: [] }, new Set(), null, tx)).rejects.toThrow(/ingredient/);
    });
  });
});

const ANA = "00000000-0000-4000-8000-0000000000a1";
const BEN = "00000000-0000-4000-8000-0000000000b2";
const ALL = new Set(["carrot", "kale", "olive-oil"]);

describe("whose a recipe is", () => {
  test("a recipe someone saved lists for them and for nobody else", async () => {
    await inRolledBackTransaction(async (tx) => {
      const slug = await saveRecipe(DRAFT, ALL, ANA, tx);
      expect((await listRecipes(ALL, ANA, tx)).map((r) => r.slug)).toContain(slug);
      expect((await listRecipes(ALL, BEN, tx)).map((r) => r.slug)).not.toContain(slug);
      expect((await listRecipes(ALL, null, tx)).map((r) => r.slug)).not.toContain(slug);
      expect((await recipePage(slug, { owner: ANA, foods: ALL }, tx))!.owner).toBe(ANA);
    });
  });

  test("its page loads for them, and for anyone else it is as if there were no such recipe", async () => {
    await inRolledBackTransaction(async (tx) => {
      const slug = await saveRecipe(DRAFT, ALL, ANA, tx);
      expect(await recipePage(slug, { owner: ANA, foods: ALL }, tx)).not.toBeNull();
      expect(await recipePage(slug, { owner: BEN, foods: ALL }, tx)).toBeNull();
      expect(await recipePage(slug, { owner: null, foods: ALL }, tx)).toBeNull();
    });
  });

  test("a page holding a food its reader has not found does not load, even for whoever built it", async () => {
    await inRolledBackTransaction(async (tx) => {
      const slug = await saveRecipe(DRAFT, ALL, ANA, tx);
      expect(await recipePage(slug, { owner: ANA, foods: new Set(["carrot", "kale"]) }, tx)).toBeNull();
    });
  });

  test("whoever built a recipe can delete it, and its ingredients and steps go with it", async () => {
    await inRolledBackTransaction(async (tx) => {
      const slug = await saveRecipe(DRAFT, ALL, ANA, tx);
      const rows = () => tx`select (select count(*)::int from recipe_ingredient ri join recipe r on r.id = ri.recipe_id where r.slug = ${slug}) as ingredients, (select count(*)::int from recipe_step rs join recipe r on r.id = rs.recipe_id where r.slug = ${slug}) as steps`;
      expect(await rows()).toEqual([{ ingredients: 3, steps: 2 }]);
      expect(await deleteRecipe(slug, ANA, tx)).toBe(true);
      expect(await recipePage(slug, { owner: ANA, foods: ALL }, tx)).toBeNull();
      expect(await rows()).toEqual([{ ingredients: 0, steps: 0 }]);
    });
  });

  test("nobody else can delete it, and nobody can delete a recipe that is everyone's", async () => {
    await inRolledBackTransaction(async (tx) => {
      const slug = await saveRecipe(DRAFT, ALL, ANA, tx);
      expect(await deleteRecipe(slug, BEN, tx)).toBe(false);
      expect(await recipePage(slug, { owner: ANA, foods: ALL }, tx)).not.toBeNull();
      expect(await tx`select owner_id from recipe where slug = 'juice'`).toEqual([{ owner_id: null }]);
      expect(await deleteRecipe("juice", ANA, tx)).toBe(false);
      expect(await tx`select 1 from recipe where slug = 'juice'`).toHaveLength(1);
    });
  });

  test("their download holds it as they built it, and deleting the account removes it", async () => {
    // eraseOwner opens its own transaction, so this one cleans up after itself.
    try {
      const slug = await saveRecipe(DRAFT, ALL, ANA);
      await saveRecipe(DRAFT, ALL, BEN);
      expect((await ownerRecord(ANA)).recipes).toEqual([{ slug, ...DRAFT }]);

      await eraseOwner(ANA);
      expect(await sql`select owner_id from recipe where name = ${DRAFT.name}`).toEqual([{ owner_id: BEN }]);
      expect(await sql`select count(*)::int as n from recipe_ingredient ri join recipe r on r.id = ri.recipe_id where r.name = ${DRAFT.name}`).toEqual([{ n: 3 }]);
    } finally {
      await sql`delete from recipe where owner_id in (${ANA}, ${BEN})`;
    }
  });
});

describe("which recipes show", () => {
  test("a recipe lists only while every food in it has been encountered", async () => {
    await inRolledBackTransaction(async (tx) => {
      await encounter(tx, ["carrot", "kale", "olive-oil"]);
      const slug = await saveRecipe(DRAFT, await uploadedFoods(tx), null, tx);
      expect((await listRecipes(await uploadedFoods(tx), null, tx)).map((r) => r.slug)).toContain(slug);

      await tx`delete from encounter where ingredient_id = (select id from ingredient where slug = 'olive-oil')`;
      expect((await listRecipes(await uploadedFoods(tx), null, tx)).map((r) => r.slug)).not.toContain(slug);
    });
  });

  test("the seeded juice stays hidden until all four of its foods are encountered", async () => {
    await inRolledBackTransaction(async (tx) => {
      await encounter(tx, ["granny-smith-apple", "carrot", "beet"]);
      expect((await listRecipes(await uploadedFoods(tx), null, tx)).map((r) => r.slug)).not.toContain("juice");
      await encounter(tx, ["kale"]);
      expect((await listRecipes(await uploadedFoods(tx), null, tx)).map((r) => r.slug)).toContain("juice");
    });
  });
});

describe("the builder's live preview", () => {
  test("a draft previews from the same functions a saved recipe's page uses", async () => {
    await inRolledBackTransaction(async (tx) => {
      const available = new Set(["carrot", "kale", "olive-oil"]);
      const preview = await draftPage({ ...DRAFT, name: "" }, available, tx);
      expect("problems" in preview).toBe(false);
      const page = preview as Exclude<typeof preview, { problems: string[] }>;
      expect(page.name).toBe("Untitled recipe");
      expect(page.grid.rows.map((r) => r.ingredientSlug).sort()).toEqual(["carrot", "kale", "olive-oil"]);
      expect(page.stepTitles).toEqual({ 1: "Steam the vegetables", 2: "Dress with oil" });
      expect(page.profile.perServing.some((t) => t.compoundSlug === "beta-carotene")).toBe(true);
    });
  });

  test("a locked food and a food that does not exist are refused in the same words, so the refusal tells nobody which is real", async () => {
    await inRolledBackTransaction(async (tx) => {
      expect(await tx`select 1 from ingredient where slug = 'olive-oil'`).toHaveLength(1);
      expect(await tx`select 1 from ingredient where slug = 'no-such-food'`).toHaveLength(0);
      const refusal = async (food: string) => {
        const preview = await draftPage({ ...DRAFT, ingredients: [{ food, grams: 10, prepMethod: "raw" }], steps: [] }, new Set(), tx);
        return (preview as { problems: string[] }).problems.map((p) => p.replaceAll(food, "FOOD"));
      };
      expect(await refusal("olive-oil")).toEqual(await refusal("no-such-food"));
    });
  });

  test("a food this builder may not use gives problems, not a preview", async () => {
    await inRolledBackTransaction(async (tx) => {
      const preview = await draftPage(DRAFT, new Set(["carrot", "kale"]), tx);
      expect(preview).toEqual({ problems: [expect.stringMatching(/olive-oil/)] });
    });
  });
});
