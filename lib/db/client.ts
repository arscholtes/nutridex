import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set: copy .env.example to .env.local and fill it in");
}

/**
 * The raw postgres.js connection; scripts call `sql.end()` when they finish.
 * Named prepared statements stay off because a transaction pooler moves each query between server
 * connections, where they fail or return another query's columns.
 */
export const sql = postgres(url, { max: 5, prepare: false });
export const db = drizzle(sql, { schema });
