// The seed's first run, on an empty database each test creates and migrates. Every other database
// test sees a database the seed has already filled, where its insert paths never run. It creates
// and drops a database, so it refuses any server that is not on this machine, and drops that
// database before and after each test, so an interrupted run leaves nothing behind.
import { execFileSync } from "node:child_process";
import postgres, { type Sql } from "postgres";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vitest";
import { sql } from "../lib/db/client.ts";
import { localDatabaseUrl } from "./local-database.ts";

const NAME = "foodi_dex_seed_first_run";
const url = localDatabaseUrl("the first-run seed test creates a database");
url.pathname = `/${NAME}`;
const firstRun = { ...process.env, DATABASE_URL: url.href };

let db: Sql;

beforeEach(async () => {
  await sql.unsafe(`drop database if exists ${NAME} with (force)`);
  await sql.unsafe(`create database ${NAME}`);
  execFileSync("node", ["node_modules/drizzle-kit/bin.cjs", "migrate"], { env: firstRun });
  db = postgres(url.href, { max: 1 });
}, 60_000);
afterEach(async () => {
  await db.end();
  await sql.unsafe(`drop database if exists ${NAME} with (force)`);
});
afterAll(() => sql.end());

describe("the seed's first run", () => {
  test("inserts both modifiers, Brown 2004's three measured members, and four applied rules, all measured", { timeout: 120_000 }, async () => {
    execFileSync("node", ["--env-file=.env.local", "scripts/seed.ts"], { env: firstRun, encoding: "utf8" });

    const [counts] = await db`
      select (select count(*)::int from absorption_modifier) as modifiers,
             (select count(*)::int from modifier_measured_member) as measured,
             (select count(*)::int from absorption_modifier_applied) as applied,
             (select count(*)::int from absorption_modifier_applied where basis = 'measured') as "appliedMeasured"`;
    expect(counts).toEqual({ modifiers: 2, measured: 3, applied: 4, appliedMeasured: 4 });
  });
});
