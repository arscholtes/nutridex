# Foodi Dex

What is in your food, what it does, and what helps it work. Built from the plan in Claude Docs,
"Foodi Dex: Build Plan" (https://claude.ai/code/artifact/6a704801-1a77-4111-aee7-d16c0a7b60e7), one phase at a time.

## Run it

```bash
npm install
cp .env.example .env.local   # add your USDA key; DATABASE_URL already points at the local cluster
npm run db:local             # project-local Postgres 16 in .pgdata, port 54329
npm run db:migrate
npm run seed                 # the plan's ingredients and compounds, amounts from USDA
npm test                     # unit tests, no database
npm run test:db              # Phase 1's "Done when", against the seeded database
npm run dev
```

To move to Supabase, set `DATABASE_URL` in `.env.local` to the project's connection string, then
run `db:migrate` and `seed` against it.

## Phases

| Phase | Done when | State |
| --- | --- | --- |
| 1. Foundation | `npm run seed` fills the database and a test query returns beta-carotene per 100 g of carrot | passing locally |
| 2. Engine | the juice recipe returns "no fat" and "fiber lost", and olive oil flips carotenoids to "enhanced" | not started |
| 3. Dex UI | carrot → beta-carotene → skin colour → pumpkin | not started |
| 4. Recipes | a built recipe's grid and profile render from the same data | not started |
| 5. Ingest | a pasted finding becomes an approvable effect row with source and limitations | not started |

## Data

Amounts come from USDA FoodData Central (SR Legacy). Each stored amount carries a `source` row
naming the USDA record it came from. A compound USDA does not measure is linked to its
ingredient with no amount, and the app shows it as missing. See `SCHEMA.md` for every table.
