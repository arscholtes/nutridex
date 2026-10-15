// Phase 1's "Done when", against a database `npm run seed` has filled:
// a test query returns beta-carotene per 100 g of carrot.
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";

afterAll(() => sql.end());

describe("a seeded database", () => {
  test("returns carrot's beta-carotene per 100 g, with its unit and its USDA source", async () => {
    const rows = await sql`
      select ic.amount_per_100g::float as amount, ic.unit, s.title, s.study_type
      from ingredient_compound ic
      join ingredient i on i.id = ic.ingredient_id
      join compound c on c.id = ic.compound_id
      join source s on s.id = ic.source_id
      where i.slug = 'carrot' and c.slug = 'beta-carotene'`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 8285, unit: "µg", study_type: "database" });
    expect(rows[0].title).toContain("fdcId 170393");
  });

  test("holds the plan's 15 ingredients, and its 12 compounds plus total fat and dietary fiber", async () => {
    const [{ ingredients, compounds }] = await sql`
      select (select count(*)::int from ingredient) as ingredients,
             (select count(*)::int from compound) as compounds`;
    expect({ ingredients, compounds }).toEqual({ ingredients: 15, compounds: 14 });
  });

  test("a compound USDA does not measure is linked to its ingredient with no amount, not a zero", async () => {
    const rows = await sql`
      select ic.amount_per_100g, ic.source_id
      from ingredient_compound ic
      join ingredient i on i.id = ic.ingredient_id
      join compound c on c.id = ic.compound_id
      where i.slug = 'beet' and c.slug = 'betanin'`;
    expect(rows).toEqual([{ amount_per_100g: null, source_id: null }]);
  });

  test("every stored amount carries its source", async () => {
    const [{ unsourced }] = await sql`
      select count(*)::int as unsourced from ingredient_compound
      where amount_per_100g is not null and source_id is null`;
    expect(unsourced).toBe(0);
  });
});
