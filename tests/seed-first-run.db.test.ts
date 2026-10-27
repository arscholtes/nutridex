// The seed's first run, on an empty database each test creates and migrates: what it inserts, and
// that it stops before writing anything when it has no USDA key or USDA has renamed a food. Every
// other database test sees a database the seed has already filled, where its insert paths never
// run. It creates and drops a database, so it refuses any server that is not on this machine, and
// drops that database before and after each test, so an interrupted run leaves nothing behind.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import postgres, { type Sql } from "postgres";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { sql } from "../lib/db/client.ts";
import type { FdcFood } from "../lib/usda/nutrients.ts";
import { localDatabaseUrl } from "./local-database.ts";

const NAME = "foodi_dex_seed_first_run";
const url = localDatabaseUrl("the first-run seed test creates a database");
url.pathname = `/${NAME}`;
const firstRun = { ...process.env, DATABASE_URL: url.href };

const carrots: FdcFood = JSON.parse(
  readFileSync(new URL("./fixtures/fdc-170393-carrots-raw.json", import.meta.url), "utf8"),
);

let db: Sql;

beforeEach(async () => {
  await sql.unsafe(`drop database if exists ${NAME} with (force)`);
  await sql.unsafe(`create database ${NAME}`);
  execFileSync("node", ["node_modules/drizzle-kit/bin.cjs", "migrate"], { env: firstRun });
  db = postgres(url.href, { max: 1 });
  // The seed reads DATABASE_URL when its client loads, so each in-process run needs a fresh one.
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", url.href);
}, 60_000);
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await db.end();
  await sql.unsafe(`drop database if exists ${NAME} with (force)`);
});
afterAll(() => sql.end());

/** @return [Promise<string[]>] the tables in the first-run database that hold any row */
async function tablesWithRows(): Promise<string[]> {
  const tables = await db<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' order by tablename`;
  const filled: string[] = [];
  for (const { tablename } of tables) {
    const [{ rows }] = await db`select count(*)::int as rows from ${db(tablename)}`;
    if (rows > 0) filled.push(tablename);
  }
  return filled;
}

describe("the seed stops before writing anything", () => {
  test("when no USDA API key is set", async () => {
    vi.stubEnv("USDA_API_KEY", undefined);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(import("../scripts/seed.ts")).rejects.toThrow("USDA_API_KEY is not set in .env.local");
    expect(fetch).not.toHaveBeenCalled();
    expect(await tablesWithRows()).toEqual([]);
  });

  test("when USDA's name for a pinned food is not the one the seed expects", async () => {
    vi.stubEnv("USDA_API_KEY", "stubbed");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...carrots, description: "Carrots, baby, raw" })));
    await expect(import("../scripts/seed.ts")).rejects.toThrow(
      'fdcId 170393 is now "Carrots, baby, raw", not "Carrots, raw"; re-check which USDA food stands for carrot',
    );
    expect(await tablesWithRows()).toEqual([]);
  });
});

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
