// `npm run seed` owns only what it lists. It must never delete a fact another writer added, even
// one citing a source the seed also cites; it removes only rows it names as retired, by exact key.
import { execFileSync } from "node:child_process";
import { afterAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";

afterAll(() => sql.end());

const runSeed = () => execFileSync("node", ["--env-file=.env.local", "scripts/seed.ts"], { encoding: "utf8" });

describe("re-running the seed", () => {
  test("keeps a rule and a class member another writer added, and removes a retired rule, saying so", { timeout: 120_000 }, async () => {
    const [unlu] = await sql`select id from source where pmid = '15735074'`;
    const [brown] = await sql`select id from source where pmid = '15277161'`;
    const [beta] = await sql`select id from compound where slug = 'beta-carotene'`;
    const [lutein] = await sql`select id from compound where slug = 'lutein-zeaxanthin'`;
    const [carotene] = await sql`select id from compound_class where chebi_id = 23042`;
    const [theirs] = await sql`
      insert into absorption_modifier (target_compound_id, modifier_condition, direction, evidence_grade, source_id)
      values (${beta.id}, 'dietary fat present', 'enhances', 'B', ${unlu.id}) returning id`;
    const [retired] = await sql`
      insert into absorption_modifier (target_compound_id, modifier_condition, direction, evidence_grade, source_id)
      values (${beta.id}, 'dietary fat present', 'enhances', 'B', ${brown.id}) returning id`;
    const [otherSource] = await sql`insert into source (title, study_type) values ('another writer''s class source', 'database') returning id`;
    await sql`insert into compound_class_member (class_id, compound_id, source_id) values (${carotene.id}, ${lutein.id}, ${otherSource.id})`;
    try {
      const out = runSeed();
      const kept = await sql`select id from absorption_modifier where id = ${theirs.id}`;
      const gone = await sql`select id from absorption_modifier where id = ${retired.id}`;
      const member = await sql`select 1 from compound_class_member where class_id = ${carotene.id} and compound_id = ${lutein.id}`;
      expect({ kept: kept.length, gone: gone.length, member: member.length }).toEqual({ kept: 1, gone: 0, member: 1 });
      expect(out).toMatch(/retired 1 absorption modifier: brown-2004 · beta-carotene · dietary fat present/);
    } finally {
      await sql`delete from absorption_modifier where id in (${theirs.id}, ${retired.id})`;
      await sql`delete from compound_class_member where source_id = ${otherSource.id}`;
      await sql`delete from source where id = ${otherSource.id}`;
    }
  });
});
