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
- `npm test` needs no database; `npm run test:db` needs `npm run db:local` and `npm run db:test` first, and runs against `TEST_DATABASE_URL`, never the database someone plays on.
- The disclaimer gate (`lib/disclaimer/`, `app/disclaimer-gate.tsx`) shows until this device has
  accepted the running version from `package.json`. Bump the version for every user-visible release;
  that is what brings the disclaimer back. Any change to its text ships with a bump.
- `CHANGELOG.md` gets a line under `## Unreleased` with every change someone can see, in words for the people using
  the app. A version bump renames that section to `## <version> - <date>`; `tests/changelog.test.ts` fails if the
  running version has no entry.
- `docs/DEVELOPMENT.md` holds how to run and change the code. `README.md` is the pitch: when a number in its
  "Where it stands" table changes, recount it from the database and update the date.

## Every platform

NutriDex ships on the web (`app/`, Next.js) and natively on iPhone, iPad and Mac (`apple/`, SwiftUI). Native
stays SwiftUI: no React Native and no web views. What both Apple apps share lives in `apple/Shared/`.

Skins are one table, `SKINS` in `lib/skins.ts`: colours, type, shapes and which treatment each thing uses. The web
reads it through `app/skin-treatments.css`, and the apps read it from the snapshot through `Theme`, so a new skin
is a new row and `npm run export:native`. Only something a treatment cannot say needs its own rules: `app/skin-new-age.css`
for the product-page layout, `app/skin-yellow.css` for the original handheld. Every screen must work in every skin, so
draw colours from the tokens and never assume a light page. The choice is stored on the server (`preference`) and
follows you between devices. Foods always keep their real colour in every skin: foil and backgrounds may shift, a
creature never does.

NutriDex is a collection game: over time you unlock everything. On iPhone and iPad nothing shows until
it is encountered: no list, name, link or count may give a hidden entry away. On the web every entry stands on the
wall, blacked out until it is encountered: a locked card shows its number and its shape and nothing else, so no
name, type, link or address in the page may say what it is (`components/wall.tsx`, held by `tests/wall.db.test.tsx`).
Searching and opening an entry stay limited to what is unlocked. New screens must keep all of this true. You say what you had, press Upload to send new encounters to the server as an array, and an unlock
animation plays, with Next returning you to where you were. The Mac app is the home database: it shows
everything, blacks out what is not unlocked, plays new arrivals when you get on it, and compares foods.

- A food unlocks the compounds it is a real source of, carries where no bar applies, or holds the most of in the
  Dex, and the effects it clears a bar for. A test holds that everything can be unlocked.
- That rule lives in `lib/db/encounters.ts` and `lib/native/snapshot.ts`, and a test holds them equal.
- The native apps write the record only through `app/api/encounters`, behind `NUTRIDEX_UPLOAD_TOKEN`. On the web a signed-in
  person writes their own rows (`app/actions.ts`); `lib/viewer.ts` is the one place that says who is asking.

- A change someone can see ships on every platform in the same PR.
- After any change to the seed, the data functions in `lib/db/dex.ts`, the art or the disclaimer, run
  `npm run export:native`. `tests/native-snapshot.db.test.ts` fails when it is forgotten.
- Judgments stay in TypeScript and reach the apps as data: the engine's flags, claim bars and dex numbers.
  Swift shows them and never works them out again.
- Layout and interface wording live in each platform's views, so nothing checks those for you. Change both.

