// Re-running the real seed keeps what another writer added, even rows citing a source the seed
// cites, and removes only the rules it names as retired. It writes to the database and fetches
// USDA records over the network, so it refuses any database that is not on this machine.
// Its rules and classes carry MARKER, and its class and measured members belong to a fixture
// compound, all swept before and after, so an interrupted run leaves nothing behind. The only real
// compound facts it changes are two ChEBI ids, put back after the run; an interrupted run can
// leave vitamin C with the id the test gave it, or beta-carotene with none until the next seed.
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from "vitest";
import { sql } from "../lib/db/client.ts";

const MARKER = "fixture: seed-ownership test";
const FIXTURE = "seed-ownership-fixture";
// ChEBI ids are positive, so no real class can collide with this one.
const EMPTY_CLASS = -1;
const host = new URL(process.env.DATABASE_URL!).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
  throw new Error(`the seed-ownership test writes to the database; refusing ${host}, which is not this machine`);
}

async function sweep(): Promise<void> {
  await sql`delete from compound where slug = ${FIXTURE}`;
  await sql`delete from absorption_modifier where magnitude = ${MARKER}`;
  await sql`delete from compound_class_member where source_id in (select id from source where title = ${MARKER})`;
  await sql`delete from source where title = ${MARKER}`;
  await sql`delete from compound_class where name = ${MARKER}`;
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

  test("keeps a ChEBI id another writer looked up for a compound the seed has none for, and writes its own", { timeout: 120_000 }, async () => {
    const before = await sql`select slug, chebi_id from compound where slug in ('beta-carotene', 'vitamin-c')`;
    await sql`update compound set chebi_id = 29073 where slug = 'vitamin-c'`;
    await sql`update compound set chebi_id = null where slug = 'beta-carotene'`;
    try {
      execFileSync("node", ["--env-file=.env.local", "scripts/seed.ts"], { encoding: "utf8" });

      const after = await sql`select slug, chebi_id from compound where slug in ('beta-carotene', 'vitamin-c') order by slug`;
      expect(after.map((r) => [r.slug, r.chebi_id])).toEqual([
        ["beta-carotene", 17579],
        ["vitamin-c", 29073],
      ]);
    } finally {
      for (const r of before) await sql`update compound set chebi_id = ${r.chebi_id} where slug = ${r.slug}`;
    }
  });

  test("inserts nothing, and goes on, for a class with no members and a class rule that measured none", { timeout: 120_000 }, async () => {
    // The seed reads its lists at import, so it runs in-process with one more class and rule in them.
    vi.resetModules();
    vi.doMock("../data/seed/facts.ts", async (importOriginal) => {
      const facts = await importOriginal<typeof import("../data/seed/facts.ts")>();
      return {
        ...facts,
        CLASSES: [...facts.CLASSES, { chebiId: EMPTY_CLASS, name: MARKER, members: [], source: "chebi-256" }],
        MODIFIERS: [...facts.MODIFIERS, { ...facts.MODIFIERS[0], target: { chebiClass: EMPTY_CLASS, measured: [] }, magnitude: MARKER }],
      };
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    onTestFinished(() => {
      vi.doUnmock("../data/seed/facts.ts");
      vi.restoreAllMocks();
    });

    await import("../scripts/seed.ts");

    const [counts] = await sql`
      select (select count(*)::int from compound_class where chebi_id = ${EMPTY_CLASS}) as classes,
             (select count(*)::int from compound_class_member m join compound_class k on k.id = m.class_id where k.chebi_id = ${EMPTY_CLASS}) as members,
             (select count(*)::int from absorption_modifier am join compound_class k on k.id = am.target_class_id where k.chebi_id = ${EMPTY_CLASS}) as rules,
             (select count(*)::int from modifier_measured_member mm join absorption_modifier am on am.id = mm.modifier_id
                join compound_class k on k.id = am.target_class_id where k.chebi_id = ${EMPTY_CLASS}) as measured`;
    expect(counts).toEqual({ classes: 1, members: 0, rules: 1, measured: 0 });
  });
});
