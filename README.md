# Foodi Dex

What is in your food, what it does, and what helps it work. Built from the plan in Claude Docs,
"Foodi Dex: Build Plan" (https://claude.ai/code/artifact/6a704801-1a77-4111-aee7-d16c0a7b60e7), one phase at a time.

## Run it

```bash
npm install
cp .env.example .env.local   # add your USDA key; DATABASE_URL already points at the local cluster
npm run db:local             # project-local Postgres 16 in .pgdata, port 54329
npm run db:migrate
npm run seed                 # the plan's ingredients and compounds, amounts from USDA, the juice recipe
npm test                     # unit tests, no database
npm run test:db              # each phase's "Done when", against the seeded database
npm run dev
```

To move to Supabase, set `DATABASE_URL` in `.env.local` to the project's connection string, then
run `db:migrate` and `seed` against it.

## Phases

| Phase | Done when | State |
| --- | --- | --- |
| 1. Foundation | `npm run seed` fills the database and a test query returns beta-carotene per 100 g of carrot | passing locally |
| 2. Engine | the juice recipe returns "no fat" and "fiber lost", and olive oil flips carotenoids to "enhanced" | passing locally |
| 3. Dex UI | carrot → beta-carotene → skin colour → pumpkin | not started |
| 4. Recipes | a built recipe's grid and profile render from the same data | not started |
| 5. Ingest | a pasted finding becomes an approvable effect row with source and limitations | not started |

## The engine

The engine is its own package, `packages/codon/`, imported as `codon` so other projects can use it.
It works out what a recipe gives you, as pure functions with no database: expand each
ingredient to its compounds, apply prep, total per serving, then check absorption modifiers,
cautions, effects, goal scores and which gut microbes it would feed. `recipeProfile` runs them in
order; `stackTotals` and `checkExcess` add supplements and check upper limits. `lib/db/engine-input.ts`
reads a recipe and its facts from the database into the engine's input.

The engine never fills a gap: an unmeasured amount, a prep with no sourced retention factor, or a
condition it cannot test comes back marked as missing or unknown. Its judgement calls (grade
weights, how much fat counts as enough, reference amounts for goal scores) are settings in
`packages/codon/src/settings.ts`, not facts.

## Data

Amounts come from USDA FoodData Central (SR Legacy). Each stored amount carries a `source` row
naming the USDA record it came from. A compound USDA does not measure is linked to its
ingredient with no amount, and the app shows it as missing. See `SCHEMA.md` for every table.
