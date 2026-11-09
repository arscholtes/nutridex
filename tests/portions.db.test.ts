// USDA's household measures, against a database `npm run seed` has filled.
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, test } from "vitest";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { sql } from "../lib/db/client.ts";
import { ingredientEntry } from "../lib/db/dex.ts";

afterAll(() => sql.end());

type UsdaPortion = { amount: number; unit: string | null; description: string; grams: number };
const weightFile = JSON.parse(readFileSync(new URL("../data/seed/usda-portions.json", import.meta.url), "utf8")) as Record<string, UsdaPortion[]>;

const carrot = INGREDIENTS.find((i) => i.slug === "carrot")!;

describe("household measures, as the seed imports them", () => {
  test("a raw carrot is 61 g medium and 128 g cup chopped", async () => {
    const rows = await sql<{ description: string; grams: string }[]>`
      select p.description, p.grams from portion p join ingredient i on i.id = p.ingredient_id
      where i.slug = ${carrot.slug} and p.description in ('medium', 'cup chopped') order by p.description`;
    expect(rows.map((r) => [r.description, Number(r.grams)])).toEqual([
      ["cup chopped", 128],
      ["medium", 61],
    ]);
  });

  test("every pinned food in the Weight file has exactly the rows the file lists, each from the Weight file's source", async () => {
    const pinned = INGREDIENTS.filter((i) => weightFile[String(i.usdaFdcId)] !== undefined);
    expect(pinned.length).toBeGreaterThan(0);
    const counts = await sql<{ slug: string; n: number }[]>`
      select i.slug, count(p.id)::int as n from ingredient i
      left join portion p on p.ingredient_id = i.id
      left join source s on s.id = p.source_id and s.url = 'https://fdc.nal.usda.gov/download-datasets.html'
      where i.slug = any(${INGREDIENTS.map((i) => i.slug)}) and (p.id is null or s.id is not null)
      group by i.slug`;
    const byFood = new Map(counts.map((c) => [c.slug, c.n]));
    for (const food of INGREDIENTS) {
      expect(byFood.get(food.slug), food.slug).toBe(weightFile[String(food.usdaFdcId)]?.length ?? 0);
    }
  });
});

describe("a food's household measures on its Dex entry", () => {
  test("come in USDA's order, as the Weight file lists them", async () => {
    const entry = (await ingredientEntry(carrot.slug))!;
    expect(entry.portions).toEqual(weightFile[String(carrot.usdaFdcId)].map((p) => ({ amount: p.amount, description: p.description, grams: p.grams })));
    expect(entry.portions.length).toBe(9);
  });
});
