// The Household measures section of a food's Dex entry, rendered without a database.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { IngredientEntryView } from "../components/ingredient-entry.tsx";
import type { IngredientEntry, Portion } from "../lib/db/dex.ts";

// The entry's claim cards import the Dex's data module, whose client needs a URL to load but connects only on a query.
vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://localhost:1/never-connected";
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const entryWith = (portions: Portion[]): IngredientEntry => ({
  ingredient: { slug: "carrot", name: "Carrot", category: "vegetable", imageUrl: null },
  pager: { number: "F006", total: 15, prev: null, next: null },
  measured: 0,
  compounds: [],
  absent: { none: [], unmeasured: [] },
  panel: [],
  portions,
  absorption: [],
  pairsWellWith: [],
  prep: [],
  bearsClaims: true,
  effects: [],
  tiles: [],
  cautions: [],
  sources: [],
  bestGrade: null,
});

const html = (entry: IngredientEntry) => renderToStaticMarkup(<IngredientEntryView entry={entry} />);

describe("a food's household measures", () => {
  test("lists each measure with its weight, the count without trailing zeros", () => {
    const page = html(
      entryWith([
        { amount: 1, description: "cup chopped", grams: 128 },
        { amount: 0.5, description: "medium", grams: 30.5 },
      ]),
    );
    expect(page).toContain("Household measures");
    expect(page).toContain("1 cup chopped");
    expect(page).toContain(">128 g<");
    expect(page).toContain("0.5 medium");
    expect(page).toContain(">30.5 g<");
    expect(page).toContain("From USDA FoodData Central. Weights are for the food as described.");
    expect(page).not.toContain("USDA lists no household measures for this food.");
  });

  test("says when USDA lists none, with no note under it", () => {
    const page = html(entryWith([]));
    expect(page).toContain("Household measures");
    expect(page).toContain("USDA lists no household measures for this food.");
    expect(page).not.toContain("Weights are for the food as described.");
  });
});
