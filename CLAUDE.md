# NutriDex

The spec is the Claude Docs plan "Foodi Dex: Build Plan" (artifact 6a704801-1a77-4111-aee7-d16c0a7b60e7).
Read it with the Claude Docs tools, never a web fetch.

## Rules from the plan's kickoff

- One phase at a time. Stop at each phase's "Done when", show it passing, and wait for the go-ahead.
- The engine (`packages/epistasis/`, imported as `epistasis`) is pure functions with no database access,
  fully unit-tested. It imports nothing outside itself and names no food database; its boundary test
  enforces both.
- Never invent nutrient amounts, retention factors or absorption magnitudes. Amounts come from USDA
  FoodData Central; anything without a source stays `null` and the UI shows it as missing.
- Every effect, modifier and caution row needs a `source_id` and an evidence grade (A–D).
- The recipe view is the spanning-cell grid: ingredients as rows, one column per step, each step
  cell spanning the ingredients it uses.
- API keys live in `.env.local` only; `.env.example` lists them.

## This repo

- Scripts run TypeScript on Node's built-in type stripping: import with `.ts` extensions and keep
  to erasable syntax (no enums, namespaces or parameter properties). `tsconfig.json` enforces it.
- Schema changes go in `lib/db/schema.ts`, then `npm run db:generate`; update `SCHEMA.md` in the same
  change.
- `npm test` needs no database; `npm run test:db` needs `npm run db:local`, `db:migrate` and `seed` first.
- The disclaimer gate (`lib/disclaimer/`, `app/disclaimer-gate.tsx`) shows until this device has
  accepted the running version from `package.json`. Bump the version for every user-visible release;
  that is what brings the disclaimer back. Any change to its text ships with a bump.

## Every platform

NutriDex ships on the web (`app/`, Next.js) and natively on iPhone, iPad and Mac (`apple/`, SwiftUI). Native
stays SwiftUI: no React Native and no web views. What both Apple apps share lives in `apple/Shared/`.

The Mac app is the home database: it also tracks what you have encountered, blacks out the rest and compares
foods across every nutrient. Those are Mac-only until encounters sync between devices.

- A change someone can see ships on every platform in the same PR.
- After any change to the seed, the data functions in `lib/db/dex.ts`, the art or the disclaimer, run
  `npm run export:native`. `tests/native-snapshot.db.test.ts` fails when it is forgotten.
- Judgments stay in TypeScript and reach the apps as data: the engine's flags, claim bars and dex numbers.
  Swift shows them and never works them out again.
- Layout and interface wording live in each platform's views, so nothing checks those for you. Change both.

