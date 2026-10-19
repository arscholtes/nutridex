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
