# Developing NutriDex

Everything needed to run and change the code. `README.md` says what NutriDex is; `SCHEMA.md` lists every
table; `CHANGELOG.md` records what changed. The specification is a private plan, "Foodi Dex: Build Plan", in
Claude Docs (artifact 6a704801-1a77-4111-aee7-d16c0a7b60e7).

## Run it

```bash
npm install
cp .env.example .env.local   # add your USDA key; DATABASE_URL already points at the local cluster
npm run db:local             # project-local Postgres 16 in .pgdata, port 54329
npm run db:migrate
npm run seed                 # the plan's ingredients, every compound, amounts from USDA, sourced facts, the juice recipe
npm run seed:foods           # every other food in USDA's SR Legacy; the first run pulls about 390 calls' worth into .usda-cache
npm test                     # unit tests, no database
npm run db:test              # creates and seeds TEST_DATABASE_URL: the 15 hand-pinned foods, nothing anyone has played
npm run test:db              # each phase's "Done when", against that database; one test re-runs
                             # the real seed (it writes and fetches USDA) to check it keeps others' rows
npm run dev                  # the Dex at http://localhost:3000
```

## Going live

The Dex runs on Vercel, with its data in Supabase Postgres. The app connects to Postgres directly
and never uses Supabase's generated API.

1. Create a Supabase project in the East US region, next to Vercel's default Washington, D.C.
   functions.
2. Turn off **Enable Data API** in that project's Data API settings. No table here has row-level
   security, so that API would otherwise serve them to anyone holding the project's public key.
3. Copy the project's two shared pooler connection strings, then load the schema and data through
   the session pooler (port 5432). `USDA_API_KEY` still comes from `.env.local`:

   ```bash
   DATABASE_URL='<session pooler string>' npm run db:migrate
   DATABASE_URL='<session pooler string>' npm run seed
   DATABASE_URL='<session pooler string>' npm run seed:foods
   ```

4. Import the repo into Vercel and set `DATABASE_URL` to the transaction pooler string (port 6543)
   before the first deploy. The build fails without it.
5. Confirm the Data API is off: this must return no rows.

   ```bash
   curl -H 'apikey: <project public key>' 'https://<project ref>.supabase.co/rest/v1/ingredient'
   ```

## Native apps

`apple/NutriDex.xcodeproj` holds the SwiftUI apps: `NutriDex` for iPhone and iPad, and `NutriDexMac`, the
home database. Neither needs a server: they bundle
`apple/Shared/Resources/dex.sqlite` and a catalog of creature art, both written by `npm run export:native`
through the same functions the website reads. Each entry sits in that file on its own, compressed, so an app
opens only what it shows. `SCHEMA.md` describes the file.

The committed file holds the test database's 15 foods, so a fresh clone builds and the tests can check it. To put
every food on your own devices, export with `--full`, build, then put the small file back before you commit:
the full one is about 78 MB, and `tests/native-snapshot.db.test.ts` fails while it is in place.

```bash
npm run export:native        # after any change to the seed, data functions, art or disclaimer
npm run export:native -- --full   # every food in DATABASE_URL, for your own devices: about 8 minutes
xcodebuild test -project apple/NutriDex.xcodeproj -scheme NutriDex \
  -destination 'platform=iOS Simulator,name=iPhone 17'
xcodebuild test -project apple/NutriDex.xcodeproj -scheme NutriDexMac -destination 'platform=macOS'
```

Uploading needs the server running and the same `NUTRIDEX_UPLOAD_TOKEN` in `.env.local` and in
`apple/Config/Local.xcconfig`. Simulators and the Mac reach it at `localhost:3200`; a real device needs this Mac's
address or a hosted server in `NUTRIDEX_API_URL`.

To install on a device, copy `apple/Config/Local.example.xcconfig` to `apple/Config/Local.xcconfig` and fill
in your team and bundle id prefix. The Mac app signs to run locally, so it needs neither.

## Phases

| Phase | Done when | State |
| --- | --- | --- |
| 1. Foundation | `npm run seed` fills the database and a test query returns beta-carotene per 100 g of carrot | passing locally |
| 2. Engine | the juice recipe returns "no fat" and "fiber lost", and olive oil flips carotenoids to "enhanced" | passing locally |
| 3. Dex UI | carrot → beta-carotene → skin color → pumpkin, with by-class flags visibly different from measured ones | passing locally |
| 4. Recipes | a built recipe's grid and profile render from the same data | passing locally on the web; the apps have no recipes yet |
| 5. Ingest | a pasted finding becomes an approvable effect row with source and limitations | not started |

## The Dex

| Screen | Path | What it shows |
| --- | --- | --- |
| Home | `/` | The wall: every entry in number order, 60 to a page, in colour once unlocked and blacked out until then. Search with fuzzy matching ("tumeric" finds turmeric), a type, or "Unlocked only" look through what you have unlocked |
| Ingredient | `/ingredients/<slug>` | What is in 100 g, against the richest food in the Dex; absorption flags; pairings; prep; effects; cautions; sources |
| Compound | `/compounds/<slug>` | How it works, solubility, what helps it absorb, prep, the foods that carry it, effects, cautions, sources |
| Effect | `/effects/<slug>` | The compounds behind it, with dose and onset, and the foods richest in each |
| Recipes | `/recipes`, `/recipes/new`, `/recipes/<slug>` | Recipes made only of foods you have unlocked: the seeded ones and your own. The builder keeps the draft in the address and redraws the grid and profile from it; saving needs an account |
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

## Skins

Choose a look under Skins, on any device: New age, Iridescent, Yellow version, Nutrition label, Field guide, Seed
packet, Sticker book, Deep sea, Receipt or Arcade. Each is a row in `lib/skins.ts`. The choice is kept on the device and, for
signed-in people, on their account, so it follows them to any browser. The native apps still share one choice
through the upload passcode and `GET` and `PUT /api/preferences`.

## Accounts

On the web, signing in is optional: without it your foods and skin stay in that browser's cookies. Sign-in is a
six-digit code by email. Supabase Auth sends and checks the code (`lib/auth/sign-in.ts`); NutriDex then keeps its
own session (`lib/db/sessions.ts`, the `session` table), so no page asks Supabase who you are. Settings
(`/settings`) shows the skin and the account, downloads everything stored for it, and deletes it.

The server needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. With either missing, the sign-in page says the
server has no sign-in and nothing else changes. On the hosted project:

1. Set up custom SMTP under **Authentication → Emails**. Supabase's built-in mailer
   [only delivers to the project's own team](https://supabase.com/docs/guides/auth/auth-smtp) and sends two an hour.
2. Under **Magic Link**, paste `supabase/templates/magic_link.html`, so the email carries the code (`{{ .Token }}`).
3. Add the two variables above to Vercel's Production environment, and run `npm run db:migrate` against the
   session pooler.

To try it locally, with Docker running:

```bash
npx supabase start -x studio,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime,realtime,postgres-meta
npx supabase status -o env        # API_URL and PUBLISHABLE_KEY are the two variables
# point DATABASE_URL at the stack's database (DB_URL), then db:migrate, seed, build and start
# codes arrive in the stack's mailbox at http://127.0.0.1:54324
```

Deleting an account removes the person from Supabase's `auth.users` over the app's own database connection, so
the app and the sign-in service must share a database, as they do on Supabase.

## Data

Amounts come from USDA FoodData Central (SR Legacy), every food and every component it reports, but
for the same measurement in a second unit (energy in kJ, vitamins A and D in IU). `npm run generate:foods`
pins each food in `data/seed/usda-foods.json`, named from USDA's description so each form is its own
food. A food with no drawing wears its category's stand-in. Each stored amount carries a `source` row
naming the USDA record it came from. A compound USDA does not measure is linked to its
ingredient with no amount, and the app shows it as missing. See `SCHEMA.md` for every table.

Three more USDA and Health Canada tables are seeded whole, so a number is never invented: household
measures from SR Legacy's Weight file (`data/seed/usda-portions.json`, the `portion` table), the Table of
Nutrient Retention Factors (`data/usda/retention-factors-r6.csv`, the `retention_factor` table, with each
food's `retention_family` decided by `lib/usda/retention.ts`), and the adult Dietary Reference Intakes
(`data/seed/intake-references.ts`, the `intake_reference` table). `npm run creatures:map` writes
`docs/creature-mapping.md`, which says which USDA foods wear each drawing and why the rest cannot;
`--apply` points newly matched foods at their drawing in the pins file.

A rule can target a ChEBI class instead of one compound, so one sourced finding reaches every
compound ChEBI places in that class. The rule names the members its source measured; any other
member is reached `by-class`, and every flag says which. `absorption_modifier_applied` lists
them: `select * from absorption_modifier_applied where basis = 'by-class'` is every claim resting
on class extension rather than measurement.

## Updating the screenshots

`docs/screenshots/` holds the images in the README. They show a test game, not anyone's real record: on the web,
a browser session on a copy of the database; on Apple devices, a debug build launched with
`-debugEncountered <foods>`, which keeps a throwaway record and cannot upload.
