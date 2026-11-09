// The adult intake references, against a database `npm run seed` has filled.
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";

afterAll(() => sql.end());

type Row = { rda: number | null; ai: number | null; ul: number | null; unit: string; ulAppliesTo: string | null };

/** @return [Promise<Row>] the one reference row for a compound, sex and age group */
async function reference(slug: string, sex: "male" | "female", ageLow: number): Promise<Row> {
  const rows = await sql<Row[]>`
    select r.rda::float as rda, r.ai::float as ai, r.ul::float as ul, r.unit, r.ul_applies_to as "ulAppliesTo"
    from intake_reference r join compound c on c.id = r.compound_id
    where c.slug = ${slug} and r.sex = ${sex} and r.age_low = ${ageLow}`;
  expect(rows).toHaveLength(1);
  return rows[0];
}

describe("adult intake references, as the seed writes them", () => {
  test("184 rows: 23 nutrients × 8 adult groups, every one citing a Health Canada table", async () => {
    const [{ n, nutrients, sourced }] = await sql<{ n: number; nutrients: number; sourced: number }[]>`
      select count(*)::int as n, count(distinct compound_id)::int as nutrients,
        count(*) filter (where s.url like 'https://www.canada.ca/%dietary-reference-intakes/tables/reference-values-%')::int as sourced
      from intake_reference r left join source s on s.id = r.source_id`;
    expect({ n, nutrients, sourced }).toEqual({ n: 184, nutrients: 23, sourced: 184 });
  });

  test("the oldest group has no upper age, the others do", async () => {
    const rows = await sql<{ ageLow: number; ageHigh: number | null; n: number }[]>`
      select age_low as "ageLow", age_high as "ageHigh", count(*)::int as n from intake_reference group by 1, 2 order by 1`;
    expect(rows).toEqual([
      { ageLow: 19, ageHigh: 30, n: 46 },
      { ageLow: 31, ageHigh: 50, n: 46 },
      { ageLow: 51, ageHigh: 70, n: 46 },
      { ageLow: 71, ageHigh: null, n: 46 },
    ]);
  });

  test("spot values match Health Canada's tables", async () => {
    expect(await reference("vitamin-c", "male", 19)).toMatchObject({ rda: 90, ai: null, unit: "mg" });
    expect(await reference("iron", "female", 19)).toMatchObject({ rda: 18, unit: "mg" });
    expect(await reference("iron", "female", 51)).toMatchObject({ rda: 8 });
    expect(await reference("vitamin-d", "male", 71)).toMatchObject({ rda: 20, unit: "µg" });
    const magnesium = await reference("magnesium", "male", 31);
    expect(magnesium).toMatchObject({ rda: 420, ul: 350 });
    expect(magnesium.ulAppliesTo).toContain("pharmacological");
    expect(await reference("choline", "female", 19)).toMatchObject({ rda: null, ai: 425 });
    expect(await reference("potassium", "male", 19)).toMatchObject({ rda: null, ai: 3400, ul: null, ulAppliesTo: null });
  });

  test("vitamin A's UL is 3000 µg of preformed vitamin A for every adult group", async () => {
    const rows = await sql<{ ul: number; ulAppliesTo: string }[]>`
      select r.ul::float as ul, r.ul_applies_to as "ulAppliesTo"
      from intake_reference r join compound c on c.id = r.compound_id where c.slug = 'vitamin-a'`;
    expect(rows).toHaveLength(8);
    for (const row of rows) expect(row).toEqual({ ul: 3000, ulAppliesTo: "UL as preformed vitamin A only." });
  });

  test("calcium's and phosphorus's ULs step down with age", async () => {
    expect((await reference("calcium", "male", 31)).ul).toBe(2500);
    expect((await reference("calcium", "male", 51)).ul).toBe(2000);
    expect((await reference("phosphorus", "male", 51)).ul).toBe(4000);
    expect((await reference("phosphorus", "male", 71)).ul).toBe(3000);
  });

  test("sodium keeps its CDRR, not a UL, and says so", async () => {
    const sodium = await reference("sodium", "female", 31);
    expect(sodium).toMatchObject({ ai: 1500, ul: 2300 });
    expect(sodium.ulAppliesTo).toContain("Chronic Disease Risk Reduction");
    expect(sodium.ulAppliesTo).toContain("no UL has been established");
  });

  test("copper is stored in mg, the Dex's unit for it", async () => {
    expect(await reference("copper", "male", 19)).toMatchObject({ rda: 0.9, ul: 10, unit: "mg" });
  });

  test("no energy or protein target: another app owns those", async () => {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from intake_reference r join compound c on c.id = r.compound_id
      where c.slug in ('energy', 'protein', 'carbohydrate', 'total-fat')`;
    expect(n).toBe(0);
  });
});
