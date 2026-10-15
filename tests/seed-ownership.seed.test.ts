// `npm run test:seed`: re-running the real seed keeps what another writer added, even rows citing a
// source the seed cites, and removes only the rules it names as retired. It writes to the database
// and fetches USDA records over the network, so it runs on its own, never inside `test:db`.
// It touches no real compound: its rules carry MARKER and its class and measured members belong to a
// fixture compound, all swept before and after, so an interrupted run leaves nothing behind.
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";

const MARKER = "fixture: seed-ownership test";
const FIXTURE = "seed-ownership-fixture";
const host = new URL(process.env.DATABASE_URL!).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
  throw new Error(`test:seed writes to the database; refusing ${host}, which is not this machine`);
}

async function sweep(): Promise<void> {
  await sql`delete from compound where slug = ${FIXTURE}`;
  await sql`delete from absorption_modifier where magnitude = ${MARKER}`;
  await sql`delete from compound_class_member where source_id in (select id from source where title = ${MARKER})`;
  await sql`delete from source where title = ${MARKER}`;
}

beforeAll(sweep);
afterAll(async () => {
  await sweep();
  await sql.end();
});

describe("re-running the seed", () => {
  test("keeps another writer's rule, class member and measured member; removes a retired rule, saying so", { timeout: 120_000 }, async () => {
    const [unlu] = await sql`select id from source where pmid = '15735074'`;
    const [brown] = await sql`select id from source where pmid = '15277161'`;
    const [beta] = await sql`select id from compound where slug = 'beta-carotene'`;
    const [fixture] = await sql`insert into compound (slug, name, class) values (${FIXTURE}, ${MARKER}, 'carotenoid') returning id`;
    const [carotene] = await sql`select id from compound_class where chebi_id = 23042`;
    const [brownRule] = await sql`select id from absorption_modifier where target_class_id = ${carotene.id}`;
    const [theirs] = await sql`
      insert into absorption_modifier (target_compound_id, modifier_condition, direction, magnitude, evidence_grade, source_id)
      values (${beta.id}, 'dietary fat present', 'enhances', ${MARKER}, 'B', ${unlu.id}) returning id`;
    const [retired] = await sql`
      insert into absorption_modifier (target_compound_id, modifier_condition, direction, magnitude, evidence_grade, source_id)
      values (${beta.id}, 'dietary fat present', 'enhances', ${MARKER}, 'B', ${brown.id}) returning id`;
    const [otherSource] = await sql`insert into source (title, study_type) values (${MARKER}, 'database') returning id`;
    await sql`insert into compound_class_member (class_id, compound_id, source_id) values (${carotene.id}, ${fixture.id}, ${otherSource.id})`;
    await sql`insert into modifier_measured_member (modifier_id, compound_id) values (${brownRule.id}, ${fixture.id})`;

    const out = execFileSync("node", ["--env-file=.env.local", "scripts/seed.ts"], { encoding: "utf8" });

    const [counts] = await sql`
      select (select count(*)::int from absorption_modifier where id = ${theirs.id}) as theirs,
             (select count(*)::int from absorption_modifier where id = ${retired.id}) as retired,
             (select count(*)::int from compound_class_member where class_id = ${carotene.id} and compound_id = ${fixture.id}) as member,
             (select count(*)::int from modifier_measured_member where modifier_id = ${brownRule.id} and compound_id = ${fixture.id}) as measured`;
    expect(counts).toEqual({ theirs: 1, retired: 0, member: 1, measured: 1 });
    expect(out).toMatch(/retired 1 absorption modifier: brown-2004 · beta-carotene · dietary fat present/);
    expect(out).toMatch(/left in place: CHEBI:23042 \(carotene\) has member seed-ownership-fixture/);
    expect(out).toMatch(/left in place: brown-2004's rule on CHEBI:23042 lists seed-ownership-fixture as measured/);
  });
});
