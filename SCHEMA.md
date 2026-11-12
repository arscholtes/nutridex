# Schema

NutriDex's own Postgres database: local in development (`npm run db:local`), Supabase when hosted. The native apps bundle a snapshot generated from it (`npm run export:native`, described at the end of this file), and write to it only through `app/api/encounters` and `app/api/preferences`.
The migration in `drizzle/` is generated from `lib/db/schema.ts`; this file describes what each table is for.
The `pg_trgm` extension (`drizzle/0004_search_trigram.sql`) gives the Dex search its fuzzy matching.

## Facts this store owns, and who else reads them

NutriDex owns food composition (amounts per 100 g), compound, microbe and supplement facts and the sources behind them, and recipes and stacks.
No other app reads this store. `fps stores` does not exist yet, so this section is the registration.

## Rules the schema enforces

- `evidence_grade` is A, B, C or D (the plan's grading table) on `compound_effect`, `absorption_modifier`, `caution`, `microbe_substrate` and `microbe_metabolite`.
- A `stack_item` names exactly one of `recipe_id` or `supplement_id`.
- `prep_effect.direction` is `decreases`, `increases` or `unchanged`.
- An `absorption_modifier` targets exactly one of `target_compound_id` or `target_class_id`.
- An `intake_reference` row names `male` or `female` and carries at least one of `rda`, `ai` or `ul`.
- Every `id` is a `uuid` defaulting to `gen_random_uuid()`; every `slug` is unique.

## Provenance

### `source`

Where every claim comes from. Every amount, effect, modifier and caution row points here. `npm run seed` writes one row per USDA FoodData Central record it imports.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `title` | text | yes |  |
| `url` | text | yes |  |
| `doi` | text | yes |  |
| `pmid` | text | yes |  |
| `study_type` | text | yes |  |
| `population` | text | yes |  |
| `year` | integer | yes |  |
| `limitations` | text | yes |  |
| `added_at` | timestamp with time zone | yes | `now()` |

## What follows someone between devices

### `preference`

A choice that should be the same on every device, such as the skin (`key` is `skin`, `value` is a skin's id). The last choice wins. `owner_id` is whose choice it is, as in `encounter`; the row with none is the one the apps share through the upload passcode. One row per owner and key. Only NutriDex reads it.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `key` | text | no |  |
| `value` | text | no |  |
| `updated_at` | timestamp with time zone | no | `now()` |
| `owner_id` | uuid | yes |  |

## What someone has encountered

### `encounter`

One row for each food someone has uploaded as had. NutriDex is a collection game: nothing shows on iPhone or iPad until it is encountered, the web shows it blacked out until then, and a food unlocks the compounds it is a real source of and the effects it clears a bar for. This is a fact about the person, NutriDex owns it, and no other app reads it.

`owner_id` is the signed-in person: the id the sign-in service (Supabase Auth, the `auth` schema of the hosted database) gives them. NutriDex does not own that fact and keeps no copy of the account, so there is no foreign key. On the web a signed-in person writes their own rows. Rows with no owner are the one record the native apps share: they write it only through `POST /api/encounters`, which needs the upload token. One row per owner and food.

Devices also hold a working copy (`encounteredFoods` in `UserDefaults`, or a cookie on the web) so the game works offline and new encounters can wait to be uploaded. On the next sync a device adds what the server has, and this table is the record.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `ingredient_id` | uuid | no |  |
| `encountered_at` | timestamp with time zone | no |  |
| `uploaded_at` | timestamp with time zone | no | `now()` |
| `owner_id` | uuid | yes |  |

## Who is signed in

### `session`

One row for each browser someone is signed in on. The browser holds a random token in a cookie; this table holds only its SHA-256 hash, so a copy of the table signs nobody in. `email` is the address that session was proven with, shown back to the person on the settings page; the sign-in service owns the account itself. A row past `expires_at` no longer signs anyone in. Deleting an account removes its rows here, in `encounter` and in `preference`, and the person from the sign-in service. Only NutriDex reads it.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `token_hash` | text | no |  |
| `owner_id` | uuid | no |  |
| `email` | text | no |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `expires_at` | timestamp with time zone | no |  |

## Food and what is in it

### `ingredient`

Things you eat. Seeded with the plan's 15; `usda_fdc_id` pins each to one USDA record.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `slug` | text | no |  |
| `name` | text | no |  |
| `category` | text | yes |  |
| `description` | text | yes |  |
| `usda_fdc_id` | integer | yes |  |
| `default_unit` | text | yes | `'g'::text` |
| `typical_serving_g` | numeric | yes |  |
| `cost_tier` | text | yes |  |
| `image_url` | text | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `retention_family` | text | yes |  |

`retention_family` names which USDA retention-factor family the food cooks like (`VEG,GREENS`, `BEEF,GROUND`, `FINFISH,<5%FAT`), decided from its category and USDA description by `lib/usda/retention.ts`; null when no family fits, and then no cooking factor ever applies to it.

### `portion`

USDA's household measures for a food, from SR Legacy's Weight file: "1 cup, chopped" of raw carrot is 128 g. One row per measure, in USDA's order (`seq`). `npm run seed` writes them for the 15 hand-pinned foods and `npm run seed:foods` for every other food; 7,533 of the 7,793 foods have at least one.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `ingredient_id` | uuid | no |  |
| `seq` | integer | no |  |
| `amount` | numeric | no |  |
| `description` | text | no |  |
| `grams` | numeric | no |  |
| `source_id` | uuid | yes |  |

### `compound`

Chemical compounds, first-class. Seeded with the plan's 12 plus `total-fat` (USDA's total lipid, which the engine's "dietary fat present" condition reads) and `dietary-fiber` (USDA's total dietary fiber, which gives juicing's fiber loss an amount), and the nutrient panel's other 27 (`PANEL_COMPOUNDS` in `lib/usda/nutrients.ts`: energy, macronutrients, vitamins, choline, minerals, and retinol for vitamin A's upper limit), identity only: properties wait for a source. `upper_limit_amount`/`upper_limit_unit` feed the supplement excess check; `art_url` is the creature card.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `slug` | text | no |  |
| `name` | text | no |  |
| `class` | text | yes |  |
| `pubchem_cid` | integer | yes |  |
| `solubility` | text | yes |  |
| `heat_stability` | text | yes |  |
| `light_stability` | text | yes |  |
| `mechanism_summary` | text | yes |  |
| `mechanism_detail` | text | yes |  |
| `upper_limit_note` | text | yes |  |
| `upper_limit_amount` | numeric | yes |  |
| `upper_limit_unit` | text | yes |  |
| `art_url` | text | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `chebi_id` | integer | yes |  |

`chebi_id` is the compound's ChEBI entity. It is null when the compound is not one entity (a combined measurement: `lutein-zeaxanthin` is two; a total: `total-fat`, `dietary-fiber`), or when no one has looked it up yet, as for most seeded compounds today.

`class` is a hand-written label for display. No rule reads it: rules reach compounds through `compound_class`, which comes from ChEBI.

### `compound_class`

A ChEBI class a rule can target, so that one sourced rule reaches every compound in it. Classes come from ChEBI, never invented here. A rule targets the narrowest class that holds what its source measured: in ChEBI, lycopene is a carotene but not a carotenoid.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `chebi_id` | integer | no |  |
| `name` | text | no |  |
| `source_id` | uuid | no |  |

`chebi_id` is unique. `source_id` names the ChEBI release the class was read from.

### `compound_class_member`

Which compounds ChEBI places under a class (`is_a`, at any depth), as of the source's release.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `class_id` | uuid | no |  |
| `compound_id` | uuid | no |  |
| `source_id` | uuid | no |  |

Primary key (`class_id`, `compound_id`).

### `ingredient_compound`

How much of a compound an ingredient has, per 100 g. Amounts are USDA's as reported, measured zeros included; `null` means not measured and the app shows it as missing, never as zero. A panel nutrient USDA does not report for a food has no row at all, and the panel shows it as missing too. `unit` is `g`, `mg` or `µg`, or `kcal` for `energy`; the engine never converts kcal to a mass.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `ingredient_id` | uuid | no |  |
| `compound_id` | uuid | no |  |
| `amount_per_100g` | numeric | yes |  |
| `unit` | text | yes |  |
| `amount_low` | numeric | yes |  |
| `amount_high` | numeric | yes |  |
| `form_note` | text | yes |  |
| `source_id` | uuid | yes |  |

Index `ingredient_compound_richest` on `(compound_id, amount_per_100g desc)` answers which food holds the most of a compound. With every USDA food loaded, the home page's query did not finish in 9 minutes without it. Index `ingredient_compound_source` on `source_id` answers what a source supports; the sources list did not finish in 2 minutes without it.

## What compounds do

### `effect`

Something a compound does, good or bad: skin color, blood pressure. `direction` is `benefit`, `risk` or `neutral`. Skin color is neutral; the effects from the permitted nutrient claims are benefits.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `slug` | text | no |  |
| `name` | text | no |  |
| `body_system` | text | yes |  |
| `direction` | text | yes |  |

### `compound_effect`

One compound's effect, with dose context, onset, evidence grade and source. `min_food_per_100g`, in the unit USDA reports the compound in, is the amount a food must reach for the claim to apply to it; null when the source sets no bar. A food below the bar does not show the effect, though the compound's own page still does.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `compound_id` | uuid | yes |  |
| `effect_id` | uuid | yes |  |
| `summary` | text | yes |  |
| `dose_context` | text | yes |  |
| `onset` | text | yes |  |
| `evidence_grade` | character | yes |  |
| `source_id` | uuid | yes |  |

### `absorption_modifier`

Compound X helped or hurt by a compound or a condition (piperine, dietary fat). `magnitude` stays qualitative unless a source gives a number.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `target_compound_id` | uuid | yes |  |
| `modifier_compound_id` | uuid | yes |  |
| `modifier_condition` | text | yes |  |
| `direction` | text | yes |  |
| `magnitude` | text | yes |  |
| `mechanism` | text | yes |  |
| `evidence_grade` | character | yes |  |
| `source_id` | uuid | yes |  |
| `target_class_id` | uuid | yes |  |

A rule targets one compound, or with `target_class_id` a whole `compound_class`. A class rule names the members its source actually measured in `modifier_measured_member`.

### `modifier_measured_member`

For a class-targeted `absorption_modifier`, the class members its source measured. Every other member is reached by class, not by measurement.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `modifier_id` | uuid | no |  |
| `compound_id` | uuid | no |  |

Primary key (`modifier_id`, `compound_id`).

### `absorption_modifier_applied` (view)

Every absorption modifier, applied to each compound it reaches, with `basis`:
- **`measured`:** a compound-targeted rule, or a class rule's measured member;
- **`by-class`:** any other member of a class rule's class.

A `by-class` row is left out when a `measured` row exists for the same compound and modifier compound or condition, whichever direction it found: a measurement outranks an inference from the class. The engine's loader reads modifiers from here, and every claim resting on class extension is `select * from absorption_modifier_applied where basis = 'by-class'`.

| Column | Type |
| --- | --- |
| `modifier_id` | uuid |
| `compound_id` | uuid |
| `basis` | text |
| `modifier_compound_id`, `modifier_condition`, `direction`, `magnitude`, `mechanism`, `evidence_grade`, `source_id` | as in `absorption_modifier` |

### `prep_effect`

How a preparation method changes a compound. `retention_factor` is `null` when no source gives one; `direction` then carries what the source does say (`decreases`, `increases` or `unchanged`), so the engine can flag "fiber lost to juicing" without inventing a number.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `compound_id` | uuid | yes |  |
| `prep_method` | text | yes |  |
| `retention_factor` | numeric | yes |  |
| `bioavailability_note` | text | yes |  |
| `source_id` | uuid | yes |  |
| `direction` | text | yes |  |

### `retention_factor`

Every row of the USDA Table of Nutrient Retention Factors, Release 6 (2007): 270 food-and-cooking codes by 26 nutrients, 7,018 rows, stored whole so a factor the engine cannot use yet is still on record. `family` is the code's food family (`VEG,ROOTS,ETC`), matched against `ingredient.retention_family`; `prep_methods` lists the engine methods the code describes (`{boiled}`, or `{boiled,baked}` for "BOILED/BAKED") and is empty for a state such as canned or frozen; `liquid_kept` is true when drippings or cooking water stay in the dish, false when they are discarded, null when the code does not say. `factor` is the share retained: USDA's percentage over 100, and null for the 24 rows of code 5005 (an alcoholic beverage stirred into a dish and baked or simmered 30 minutes) whose cell is blank in USDA's own file; the engine applies only rows with a factor. `compound_id` is null for the nutrients the Dex has no compound for.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `retention_code` | integer | no |  |
| `food_group_code` | integer | no |  |
| `description` | text | no |  |
| `family` | text | no |  |
| `prep_methods` | text[] | no |  |
| `liquid_kept` | boolean | yes |  |
| `nutrient_number` | integer | no |  |
| `nutrient_name` | text | no |  |
| `compound_id` | uuid | yes |  |
| `factor` | numeric | yes |  |
| `source_id` | uuid | yes |  |

### `caution`

Drug interactions, antinutrients, excess and allergens.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `compound_id` | uuid | yes |  |
| `ingredient_id` | uuid | yes |  |
| `kind` | text | yes |  |
| `summary` | text | yes |  |
| `threshold_note` | text | yes |  |
| `evidence_grade` | character | yes |  |
| `source_id` | uuid | yes |  |

## Daily references

### `intake_reference`

Dietary Reference Intakes for adults, as Health Canada's DRI tables publish them: one row per compound, sex and age group (19–30, 31–50, 51–70, 71 and over; `age_high` null for the last). `rda` or `ai` is the daily reference; `ul` the Tolerable Upper Intake Level, null where none has been set. `ul_applies_to` records what the limit counts, so a food is never flagged for a limit that covers supplements only: vitamin A's UL is preformed retinol, magnesium's is pharmacological intake, folate's, niacin's and vitamin E's are synthetic forms. No energy or protein target is stored: another app owns those.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `compound_id` | uuid | no |  |
| `sex` | text | no |  |
| `age_low` | integer | no |  |
| `age_high` | integer | yes |  |
| `rda` | numeric | yes |  |
| `ai` | numeric | yes |  |
| `ul` | numeric | yes |  |
| `unit` | text | no |  |
| `ul_applies_to` | text | yes |  |
| `source_id` | uuid | yes |  |

## Recipes

### `recipe`

A recipe.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `slug` | text | no |  |
| `name` | text | no |  |
| `servings` | integer | yes | `1` |
| `notes` | text | yes |  |

### `recipe_ingredient`

An ingredient in a recipe, in grams, with its preparation.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `recipe_id` | uuid | yes |  |
| `ingredient_id` | uuid | yes |  |
| `grams` | numeric | no |  |
| `prep_method` | text | yes | `'raw'::text` |
| `position` | integer | yes |  |

### `recipe_step`

A step; its `prep_method` applies to the ingredients it touches.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `recipe_id` | uuid | yes |  |
| `position` | integer | yes |  |
| `title` | text | yes |  |
| `instruction` | text | yes |  |
| `timer_seconds` | integer | yes |  |
| `prep_method` | text | yes |  |

### `recipe_step_ingredient`

Which ingredients a step touches. Powers the spanning-cell recipe grid.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `step_id` | uuid | no |  |
| `recipe_ingredient_id` | uuid | no |  |

## Ingest

### `ingest_draft`

The review queue for AI-extracted facts. Nothing in `proposed` reaches another table until approved.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `raw_input` | text | yes |  |
| `source_url` | text | yes |  |
| `proposed` | jsonb | yes |  |
| `status` | text | yes | `'pending'::text` |
| `created_at` | timestamp with time zone | yes | `now()` |

## Microbiome

### `microbe`

Gut microbes, first-class like compounds.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `slug` | text | no |  |
| `name` | text | no |  |
| `common_name` | text | yes |  |
| `rank` | text | yes |  |
| `ncbi_taxon_id` | integer | yes |  |
| `habitat` | text | yes |  |
| `description` | text | yes |  |
| `art_url` | text | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

### `microbe_substrate`

What a microbe ferments, and what promotes or inhibits it.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `microbe_id` | uuid | no |  |
| `compound_id` | uuid | no |  |
| `relationship` | text | no |  |
| `evidence_grade` | character | yes |  |
| `source_id` | uuid | yes |  |

### `microbe_metabolite`

What a microbe makes; products are compounds.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `microbe_id` | uuid | yes |  |
| `substrate_compound_id` | uuid | yes |  |
| `product_compound_id` | uuid | yes |  |
| `evidence_grade` | character | yes |  |
| `source_id` | uuid | yes |  |

## Supplements

### `supplement`

Things you take, not cook. `dsld_id` links the NIH Dietary Supplement Label Database.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `slug` | text | no |  |
| `name` | text | no |  |
| `kind` | text | yes |  |
| `brand` | text | yes |  |
| `dsld_id` | integer | yes |  |
| `serving_unit` | text | yes |  |
| `third_party_tested` | text | yes |  |
| `art_url` | text | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

### `supplement_compound`

What one serving delivers, from the label or a lab test.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `supplement_id` | uuid | no |  |
| `compound_id` | uuid | no |  |
| `amount_per_serving` | numeric | yes |  |
| `unit` | text | yes |  |
| `form` | text | yes |  |
| `standardized_to` | text | yes |  |
| `source_id` | uuid | yes |  |

### `supplement_microbe`

The microbes a probiotic contains.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `supplement_id` | uuid | no |  |
| `microbe_id` | uuid | no |  |
| `strain` | text | yes |  |
| `cfu_per_serving` | numeric | yes |  |
| `source_id` | uuid | yes |  |

### `stack`

A day: recipes and supplements together.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `name` | text | no |  |
| `notes` | text | yes |  |

### `stack_item`

One recipe or one supplement in a stack, never both (enforced by a check).

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `stack_id` | uuid | yes |  |
| `recipe_id` | uuid | yes |  |
| `supplement_id` | uuid | yes |  |
| `servings` | numeric | no | `1` |

## The apps' data file

`apple/Shared/Resources/dex.sqlite` is not part of this database: `npm run export:native` writes it from this
database for the native apps to bundle, and nothing reads it back into Postgres. Every body is JSON compressed
with raw DEFLATE, and `size` is its length before compressing, so a reader can tell a whole body from a damaged one.
Ids in it are numbered by where they first appear (`id-0001`), since database ids change with every database.

`meta` holds what the whole app shares, one row per key:

| key | what it holds |
| --- | --- |
| `head` | the version, disclaimer, type colours, skins, and the web's results for a few searches, which the apps' tests check their own search against |
| `cards` | every entry's card, with a line about it, its creature's image name and the ids of the sources behind it |
| `reveals` | what marking each food as had unlocks |
| `sources` | every citation |
| `compare` | every food's nutrient panel, for the Mac's comparison table |

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `key` | text | no |  |
| `size` | integer | no |  |
| `body` | blob | no |  |

`entry` holds one row per food, compound and effect: the full entry the app shows when it is opened.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `kind` | text | no |  |
| `slug` | text | no |  |
| `size` | integer | no |  |
| `body` | blob | no |  |
