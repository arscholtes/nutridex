import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

// Database tests read DATABASE_URL from .env.local; a checkout without one has no database to test.
const localEnv = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/**/*.test.{ts,tsx}", "packages/*/tests/**/*.test.ts"],
          exclude: ["tests/**/*.db.test.{ts,tsx}"],
        },
      },
      {
        test: {
          name: "db",
          include: ["tests/**/*.db.test.{ts,tsx}"],
          // Every file shares one database, and one re-runs the real seed against it.
          fileParallelism: false,
          env: localEnv,
        },
      },
    ],
  },
});
