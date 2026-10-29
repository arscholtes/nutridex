// The loader refuses a modifier the plan forbids, naming the compound it targets. loadFacts reads
// through the shared connection pool, outside any transaction a test holds, so it cannot see a
// rolled-back fixture: these rules are committed, on an ingredient and compound of the test's own,
// and swept before and after, so an interrupted run leaves nothing behind.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { loadFacts } from "../lib/db/engine-input.ts";
import { localDatabaseUrl } from "./local-database.ts";

const FIXTURE = "loader-refusal-fixture";
localDatabaseUrl("the loader-refusal test commits rows");

let compoundId: string;
let sourceId: string;

/** Deleting the fixture compound and ingredient takes their links and rules with them. */
async function sweep(): Promise<void> {
  await sql`delete from ingredient where slug = ${FIXTURE}`;
  await sql`delete from compound where slug = ${FIXTURE}`;
}

beforeAll(async () => {
  await sweep();
  const [c] = await sql`insert into compound (slug, name) values (${FIXTURE}, ${FIXTURE}) returning id`;
  const [i] = await sql`insert into ingredient (slug, name) values (${FIXTURE}, ${FIXTURE}) returning id`;
  await sql`insert into ingredient_compound (ingredient_id, compound_id) values (${i.id}, ${c.id})`;
  const [brown] = await sql`select id from source where pmid = '15277161'`;
  compoundId = c.id;
  sourceId = brown.id;
});
afterEach(async () => {
  await sql`delete from absorption_modifier where target_compound_id = ${compoundId}`;
});
afterAll(async () => {
  await sweep();
  await sql.end();
});

describe("loadFacts refuses a modifier, naming the compound it targets, when the rule has", () => {
  test("no source", async () => {
    await sql`
      insert into absorption_modifier (target_compound_id, modifier_condition, direction, evidence_grade)
      values (${compoundId}, 'dietary fat present', 'enhances', 'B')`;
    await expect(loadFacts([FIXTURE])).rejects.toThrow(`absorption_modifier on ${FIXTURE} has no source`);
  });

  test("no evidence grade", async () => {
    await sql`
      insert into absorption_modifier (target_compound_id, modifier_condition, direction, source_id)
      values (${compoundId}, 'dietary fat present', 'enhances', ${sourceId})`;
    await expect(loadFacts([FIXTURE])).rejects.toThrow(`absorption_modifier on ${FIXTURE} has no evidence grade`);
  });

  test("a direction other than enhances or inhibits", async () => {
    await sql`
      insert into absorption_modifier (target_compound_id, modifier_condition, direction, evidence_grade, source_id)
      values (${compoundId}, 'dietary fat present', 'sideways', 'B', ${sourceId})`;
    await expect(loadFacts([FIXTURE])).rejects.toThrow(`absorption_modifier on ${FIXTURE}: "sideways" is not one of enhances, inhibits`);
  });
});
