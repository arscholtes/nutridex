# NutriDex

What is in your food, what it does, and what helps it work. Built from the plan in Claude Docs,
"Foodi Dex: Build Plan" (https://claude.ai/code/artifact/6a704801-1a77-4111-aee7-d16c0a7b60e7), one phase at a time.

## Run it

```bash
npm install
cp .env.example .env.local   # add your USDA key; DATABASE_URL already points at the local cluster
npm run db:local             # project-local Postgres 16 in .pgdata, port 54329
npm run db:migrate
npm run seed                 # the plan's ingredients and compounds, amounts from USDA, sourced facts, the juice recipe
npm test                     # unit tests, no database
npm run test:db              # each phase's "Done when", against the seeded database; one test re-runs
                             # the real seed (it writes and fetches USDA) to check it keeps others' rows
npm run dev                  # the Dex at http://localhost:3000
```

To move to Supabase, set `DATABASE_URL` in `.env.local` to the project's connection string, then
run `db:migrate` and `seed` against it.

## Native apps

`apple/NutriDex.xcodeproj` holds the SwiftUI apps: `NutriDex` for iPhone and iPad, and `NutriDexMac`, the
home database. Neither needs a server: they bundle
`apple/Shared/Resources/dex.json` and a catalog of creature art, both written by `npm run export:native`
from the local database, through the same functions the website reads.

```bash
npm run export:native        # after any change to the seed, data functions, art or disclaimer
xcodebuild test -project apple/NutriDex.xcodeproj -scheme NutriDex \
  -destination 'platform=iOS Simulator,name=iPhone 17'
xcodebuild test -project apple/NutriDex.xcodeproj -scheme NutriDexMac -destination 'platform=macOS'
```

To install on a device, copy `apple/Config/Local.example.xcconfig` to `apple/Config/Local.xcconfig` and fill
in your team and bundle id prefix. The Mac app signs to run locally, so it needs neither.

## Phases

| Phase | Done when | State |
| --- | --- | --- |
| 1. Foundation | `npm run seed` fills the database and a test query returns beta-carotene per 100 g of carrot | passing locally |
| 2. Engine | the juice recipe returns "no fat" and "fiber lost", and olive oil flips carotenoids to "enhanced" | passing locally |
| 3. Dex UI | carrot → beta-carotene → skin color → pumpkin, with by-class flags visibly different from measured ones | passing locally |
| 4. Recipes | a built recipe's grid and profile render from the same data | not started |
| 5. Ingest | a pasted finding becomes an approvable effect row with source and limitations | not started |

## The Dex

| Screen | Path | What it shows |
| --- | --- | --- |
| Home | `/` | Every entry as a card. Search with fuzzy matching ("tumeric" finds turmeric), filter by kind and type |
| Ingredient | `/ingredients/<slug>` | What is in 100 g, against the richest food in the Dex; absorption flags; pairings; prep; effects; cautions; sources |
| Compound | `/compounds/<slug>` | How it works, solubility, what helps it absorb, prep, the foods that carry it, effects, cautions, sources |
| Effect | `/effects/<slug>` | The compounds behind it, with dose and onset, and the foods richest in each |
| Sources | `/sources` | Every citation, what it supports, and its limitations |

An ingredient's flags come from the engine run on 100 g of it, so the Dex and a recipe judge the same
facts the same way. `lib/db/dex.ts` reads every screen's data. Every claim carries its grade badge, with
its source's limitations on hover. A claim resting on a ChEBI class is drawn dashed and striped and
says "By class", wherever it appears. A section with nothing on file says so; it does not disappear.

Ingredients have drawn creatures (`public/art/ingredients/`). Compounds have none yet, so each gets a creature
drawn from its data (`lib/art/creature.ts`): its class sets the colour and shape, in the same house style.

## The engine

The engine is its own package, `packages/epistasis/`, imported as `epistasis` so other projects can use it.
It works out what a recipe gives you, as pure functions with no database: expand each
ingredient to its compounds, apply prep, total per serving, then check absorption modifiers,
cautions, effects, goal scores and which gut microbes it would feed. `recipeProfile` runs them in
order; `stackTotals` and `checkExcess` add supplements and check upper limits. `lib/db/engine-input.ts`
reads a recipe and its facts from the database into the engine's input.

The engine never fills a gap: an unmeasured amount, a prep with no sourced retention factor, or a
condition it cannot test comes back marked as missing or unknown. Its judgement calls (grade
weights, how much fat counts as enough, reference amounts for goal scores) are settings in
`packages/epistasis/src/settings.ts`, not facts.

## Disclaimer

Every visitor sees a disclaimer (`lib/disclaimer/text.ts`) before anything else. Accepting it sets a
cookie holding the app version from `package.json`; it stays dismissed until that version changes, so
bump the version with each release. The text is a plain-language draft and needs legal review before
anyone other than its maker uses the app.

## Data

Amounts come from USDA FoodData Central (SR Legacy). Each stored amount carries a `source` row
naming the USDA record it came from. A compound USDA does not measure is linked to its
ingredient with no amount, and the app shows it as missing. See `SCHEMA.md` for every table.

A rule can target a ChEBI class instead of one compound, so one sourced finding reaches every
compound ChEBI places in that class. The rule names the members its source measured; any other
member is reached `by-class`, and every flag says which. `absorption_modifier_applied` lists
them: `select * from absorption_modifier_applied where basis = 'by-class'` is every claim resting
on class extension rather than measurement.
