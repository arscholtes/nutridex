import { defineConfig } from "drizzle-kit";

// `db:generate` needs no database; `db:migrate` runs with .env.local loaded and needs DATABASE_URL.
const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  ...(url ? { dbCredentials: { url } } : {}),
});
