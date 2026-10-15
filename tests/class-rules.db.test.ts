// Class rules: one sourced rule reaches every compound in a ChEBI class, and every claim that
// rests on the class rather than a measurement can be listed. Needs `npm run seed` first.
import { afterAll, describe, expect, test } from "vitest";
import { recipeProfile, DEFAULT_SETTINGS } from "codon";
import { sql } from "../lib/db/client.ts";
import { loadFacts, loadRecipe } from "../lib/db/engine-input.ts";

afterAll(() => sql.end());

const ROLLBACK = new Error("rollback the fixture");

/** Run `body` in a transaction that is always rolled back, so fixtures never persist. */
async function inRolledBackTransaction(body: (tx: typeof sql) => Promise<void>): Promise<void> {
  await expect(
    sql.begin(async (tx) => {
      await body(tx as unknown as typeof sql);
      throw ROLLBACK;
    }),
  ).rejects.toBe(ROLLBACK);
}

describe("ChEBI identity and classes", () => {
  test("each carotenoid carries its ChEBI id; the combined lutein + zeaxanthin measurement has none", async () => {
    const rows = await sql`
      select slug, chebi_id from compound
      where slug in ('alpha-carotene', 'beta-carotene', 'lutein-zeaxanthin', 'lycopene') order by slug`;
    expect(rows.map((r) => [r.slug, r.chebi_id])).toEqual([
      ["alpha-carotene", 28425],
      ["beta-carotene", 17579],
      ["lutein-zeaxanthin", null],
      ["lycopene", 15948],
    ]);
  });

  test("ChEBI's carotene class holds alpha-carotene, beta-carotene and lycopene, not lutein + zeaxanthin", async () => {
    const rows = await sql`
      select c.slug, s.title from compound_class k
      join compound_class_member m on m.class_id = k.id
      join compound c on c.id = m.compound_id
      join source s on s.id = m.source_id
      where k.chebi_id = 23042 order by c.slug`;
    expect(rows.map((r) => r.slug)).toEqual(["alpha-carotene", "beta-carotene", "lycopene"]);
    for (const r of rows) expect(r.title).toMatch(/ChEBI release 256/);
  });

  test("an absorption modifier targets exactly one of a compound or a class", async () => {
    await inRolledBackTransaction(async (tx) => {
      const [k] = await tx`select id from compound_class where chebi_id = 23042`;
      const [c] = await tx`select id from compound where slug = 'beta-carotene'`;
      await expect(
        tx`insert into absorption_modifier (target_compound_id, target_class_id, direction) values (${c.id}, ${k.id}, 'enhances')`,
      ).rejects.toThrow(/absorption_modifier_one_target/);
    });
  });
});

describe("Brown 2004 as one class rule", () => {
  test("targets ChEBI's carotene class and names the three carotenes it measured", async () => {
    const rows = await sql`
      select k.chebi_id, array_agg(c.slug order by c.slug) as measured
      from absorption_modifier am
      join source s on s.id = am.source_id
      join compound_class k on k.id = am.target_class_id
      join modifier_measured_member mm on mm.modifier_id = am.id
      join compound c on c.id = mm.compound_id
      where s.pmid = '15277161'
      group by k.chebi_id`;
    expect(rows).toEqual([{ chebi_id: 23042, measured: ["alpha-carotene", "beta-carotene", "lycopene"] }]);
  });

  test("the juice still gets one fat flag per carotenoid, every one measured", async () => {
    const juice = await loadRecipe("juice");
    const profile = recipeProfile(juice, await loadFacts(juice.ingredients.map((ri) => ri.ingredientSlug)), DEFAULT_SETTINGS, []);
    const fat = profile.absorption.filter((a) => a.reason.includes("g of fat per serving"));
    expect(fat.map((a) => [a.compoundSlug, a.basis]).sort()).toEqual([
      ["alpha-carotene", "measured"],
      ["beta-carotene", "measured"],
      ["lutein-zeaxanthin", "measured"],
      ["lycopene", "measured"],
    ]);
  });
});

describe("measured members", () => {
  const outsideTheirClass = (tx: typeof sql) => tx`
    select c.slug from modifier_measured_member mm
    join absorption_modifier am on am.id = mm.modifier_id
    join compound c on c.id = mm.compound_id
    left join compound_class_member m on m.class_id = am.target_class_id and m.compound_id = mm.compound_id
    where m.compound_id is null`;

  test("none sits outside its rule's class, where the view would drop it without a word", async () => {
    expect(await outsideTheirClass(sql)).toEqual([]);
  });

  test("the check above catches one that does", async () => {
    await inRolledBackTransaction(async (tx) => {
      const [brown] = await tx`select id from absorption_modifier where target_class_id is not null`;
      const [lutein] = await tx`select id from compound where slug = 'lutein-zeaxanthin'`;
      await tx`insert into modifier_measured_member (modifier_id, compound_id) values (${brown.id}, ${lutein.id})`;
      expect(await outsideTheirClass(tx)).toEqual([{ slug: "lutein-zeaxanthin" }]);
    });
  });
});

describe("claims resting on class extension", () => {
  test("are listed by the view, and a measured rule for the same compound suppresses them", async () => {
    await inRolledBackTransaction(async (tx) => {
      const [gamma] = await tx`insert into compound (slug, name, class) values ('gamma-carotene-fixture', 'gamma-Carotene (fixture)', 'carotenoid') returning id`;
      const [k] = await tx`select id, source_id from compound_class where chebi_id = 23042`;
      await tx`insert into compound_class_member (class_id, compound_id, source_id) values (${k.id}, ${gamma.id}, ${k.source_id})`;

      const byClass = await tx`
        select c.slug, s.pmid from absorption_modifier_applied a
        join compound c on c.id = a.compound_id join source s on s.id = a.source_id
        where a.basis = 'by-class'`;
      expect(byClass).toEqual([{ slug: "gamma-carotene-fixture", pmid: "15277161" }]);

      const [brown] = await tx`select source_id from absorption_modifier where target_class_id = ${k.id}`;
      await tx`
        insert into absorption_modifier (target_compound_id, modifier_condition, direction, evidence_grade, source_id)
        values (${gamma.id}, 'dietary fat present', 'enhances', 'B', ${brown.source_id})`;
      const after = await tx`select basis from absorption_modifier_applied where compound_id = ${gamma.id}`;
      expect(after.map((r) => r.basis)).toEqual(["measured"]);
    });
  });

  test("a measured rule wins over the class even when it disagrees in direction", async () => {
    await inRolledBackTransaction(async (tx) => {
      const [gamma] = await tx`insert into compound (slug, name, class) values ('gamma-carotene-fixture', 'gamma-Carotene (fixture)', 'carotenoid') returning id`;
      const [k] = await tx`select id, source_id from compound_class where chebi_id = 23042`;
      await tx`insert into compound_class_member (class_id, compound_id, source_id) values (${k.id}, ${gamma.id}, ${k.source_id})`;
      const [brown] = await tx`select source_id from absorption_modifier where target_class_id = ${k.id}`;
      await tx`
        insert into absorption_modifier (target_compound_id, modifier_condition, direction, evidence_grade, source_id)
        values (${gamma.id}, 'dietary fat present', 'inhibits', 'B', ${brown.source_id})`;
      const rows = await tx`select basis, direction from absorption_modifier_applied where compound_id = ${gamma.id}`;
      expect(rows.map((r) => [r.basis, r.direction])).toEqual([["measured", "inhibits"]]);
    });
  });
});
