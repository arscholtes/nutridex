// Phase 4's "Done when": you build a recipe and the grid and profile both render from the same data.
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, test } from "vitest";
import { RecipeView } from "../components/recipe-view.tsx";
import { sql } from "../lib/db/client.ts";
import { recordEncounters, revealedEntries } from "../lib/db/encounters.ts";
import { recipePage, saveRecipe, uploadedFoods, type RecipeDraft, type RecipePage } from "../lib/db/recipes.ts";
import { inRolledBackTransaction } from "./helpers/db.ts";
import { localDatabaseUrl } from "./local-database.ts";

localDatabaseUrl("the phase 4 test writes a recipe to the database");
afterAll(() => sql.end());

const DRAFT: RecipeDraft = {
  name: "Carrot and kale with oil",
  servings: 1,
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

/** Build the recipe the way every platform saves one, then load its page. */
async function built(tx: typeof sql): Promise<RecipePage> {
  await recordEncounters(["carrot", "kale", "olive-oil"].map((food) => ({ food, encounteredAt: "2026-11-09T12:00:00.000Z" })), null, tx);
  const page = await recipePage(await saveRecipe(DRAFT, await uploadedFoods(tx), null, tx), tx);
  expect(page).not.toBeNull();
  return page!;
}

const foodsCounted = (page: RecipePage) =>
  new Set(page.profile.perServing.flatMap((t) => [...t.contributors.map((c) => c.ingredientSlug), ...t.missingFrom]));
const betaCaroteneFrom = (page: RecipePage, food: string) =>
  page.profile.perServing.find((t) => t.compoundSlug === "beta-carotene")!.contributors.find((c) => c.ingredientSlug === food)!.amount!;

describe("a built recipe's grid and profile render from the same data", () => {
  test("the foods the profile counts are exactly the grid's rows", async () => {
    await inRolledBackTransaction(async (tx) => {
      const page = await built(tx);
      expect(new Set(page.grid.rows.map((r) => r.ingredientSlug))).toEqual(foodsCounted(page));
      expect(page.grid.rows.map((r) => r.ingredientSlug).sort()).toEqual(["carrot", "kale", "olive-oil"]);
    });
  });

  test("changing the saved recipe changes the grid and the profile together", async () => {
    await inRolledBackTransaction(async (tx) => {
      const before = await built(tx);
      await tx`update recipe_ingredient set grams = 244 where id = ${before.grid.rows.find((r) => r.ingredientSlug === "carrot")!.recipeIngredientId}`;
      const after = (await recipePage(before.slug, tx))!;
      expect(after.grid.rows.find((r) => r.ingredientSlug === "carrot")!.grams).toBe(244);
      // Kale carries beta-carotene too, so only the carrot's share of it doubles.
      expect(betaCaroteneFrom(before, "kale")).toBeGreaterThan(0);
      expect(betaCaroteneFrom(after, "carrot")).toBeCloseTo(betaCaroteneFrom(before, "carrot") * 2, 5);
      expect(betaCaroteneFrom(after, "kale")).toBeCloseTo(betaCaroteneFrom(before, "kale"), 5);
    });
  });

  test("a food never had is marked, and nothing links to an entry that is still closed", async () => {
    await inRolledBackTransaction(async (tx) => {
      const page = await built(tx);
      const html = renderToStaticMarkup(<RecipeView page={page} revealed={await revealedEntries(["carrot"], tx)} cookable />);
      expect(html.match(/Not had yet/g)).toHaveLength(2);
      expect(html).toContain('href="/ingredients/carrot"');
      expect(html).not.toContain('href="/ingredients/kale"');
      const open = await revealedEntries(["carrot"], tx);
      for (const [, kind, slug] of html.matchAll(/href="\/(compounds|effects)\/([^"]+)"/g)) {
        expect((kind === "compounds" ? open.compounds : open.effects).has(slug), `${kind}/${slug} is linked but closed`).toBe(true);
      }
      expect(html).toContain(`href="/recipes/${page.slug}/cook"`);
    });
  });

  test("the page draws the grid, each step spanning its rows, and the profile beneath it", async () => {
    await inRolledBackTransaction(async (tx) => {
      const page = await built(tx);
      const html = renderToStaticMarkup(<RecipeView page={page} revealed={await revealedEntries(["carrot", "kale", "olive-oil"], tx)} />);
      for (const name of ["Carrot", "Kale", "Olive oil", "Steam the vegetables", "Dress with oil"]) {
        expect(html).toContain(name);
      }
      expect(html).toMatch(/rowSpan="2"|rowspan="2"/);
      expect(html).toMatch(/rowSpan="3"|rowspan="3"/);
      expect(html.indexOf("Steam the vegetables")).toBeLessThan(html.indexOf("Per serving"));
      expect(html).toContain("/compounds/beta-carotene");
    });
  });
});
