// docs/api/v1.openapi.json is what app builders read, so it must list exactly the calls the server answers.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const spec = JSON.parse(readFileSync(join(ROOT, "docs/api/v1.openapi.json"), "utf8")) as {
  paths: Record<string, Record<string, { security?: unknown; responses: Record<string, unknown> }>>;
  components: { schemas: Record<string, unknown> };
};

const served = (dir: string, path: string): string[] =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return served(join(dir, entry.name), `${path}/${entry.name}`);
    if (entry.name !== "route.ts") return [];
    const source = readFileSync(join(ROOT, dir, entry.name), "utf8");
    return [...source.matchAll(/^export async function (GET|POST|PUT|PATCH|DELETE)\b/gm)].map((m) => `${m[1]} ${path}`);
  });

const documented = Object.entries(spec.paths).flatMap(([path, calls]) => Object.keys(calls).map((method) => `${method.toUpperCase()} ${path}`));

test("the file lists every call the server answers, and none it does not", () => {
  expect(documented.sort()).toEqual(served("app/api/v1", "/api/v1").sort());
});

test("every call that needs a session says so and documents its refusal; only signing in does not", () => {
  const open = Object.entries(spec.paths).flatMap(([path, calls]) => Object.entries(calls).filter(([, call]) => !call.security).map(([method]) => `${method.toUpperCase()} ${path}`));
  expect(open.sort()).toEqual(["POST /api/v1/session", "POST /api/v1/session/code"]);
  for (const calls of Object.values(spec.paths)) for (const call of Object.values(calls)) if (call.security) expect(call.responses).toHaveProperty("401");
});

test("every schema the file points at exists", () => {
  const pointed = [...JSON.stringify(spec).matchAll(/"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]);
  expect(pointed.filter((name) => !(name in spec.components.schemas))).toEqual([]);
});
