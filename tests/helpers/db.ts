// Database test helpers.
import { expect } from "vitest";
import { sql } from "../../lib/db/client.ts";

const ROLLBACK = new Error("rollback the fixture");

/**
 * Run `body` in a transaction that is always rolled back, so fixtures never persist.
 * @param body [(tx) => Promise<void>] the test, given the transaction to query through
 * @return [Promise<void>]
 */
export async function inRolledBackTransaction(body: (tx: typeof sql) => Promise<void>): Promise<void> {
  await expect(
    sql.begin(async (tx) => {
      await body(tx as unknown as typeof sql);
      throw ROLLBACK;
    }),
  ).rejects.toBe(ROLLBACK);
}

/**
 * Run `body` with a stand-in for the sign-in service's users table, which the test database does not have.
 * @param users [string[]] the ids of the people it holds
 * @param body [() => Promise<void>] the test
 * @return [Promise<void>]
 */
export async function withSignInService(users: string[], body: () => Promise<void>): Promise<void> {
  await sql`create schema auth`;
  try {
    await sql`create table auth.users (id uuid primary key)`;
    for (const id of users) await sql`insert into auth.users (id) values (${id})`;
    await body();
  } finally {
    await sql`drop schema auth cascade`;
  }
}
