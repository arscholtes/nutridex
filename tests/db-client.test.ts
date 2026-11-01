import { afterAll, expect, test, vi } from "vitest";

vi.stubEnv("DATABASE_URL", "postgres://localhost:1/never-connected");
const { sql } = await import("../lib/db/client.ts");
afterAll(() => sql.end());

test("the connection names no prepared statements, which Supabase's transaction pooler cannot serve", () => {
  expect(sql.options.prepare).toBe(false);
});
