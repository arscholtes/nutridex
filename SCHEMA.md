# Schema

NutriDex's own Postgres database: local in development (`npm run db:local`), Supabase when hosted. The native apps bundle a snapshot generated from it (`npm run export:native`) and write nothing back.
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

## What someone has encountered

### `encounter`

One row for each food someone has uploaded as had. NutriDex is a collection game: nothing shows on the web, iPhone or iPad until it is encountered, and a food unlocks the compounds it is a real source of and the effects it clears a bar for. This is a fact about the person, NutriDex owns it, and no other app reads it. Apps write it only through `POST /api/encounters`, which needs the upload token.

Devices also hold a working copy (`encounteredFoods` in `UserDefaults`, or a cookie on the web) so the game works offline and new encounters can wait to be uploaded. On the next sync a device adds what the server has, and this table is the record.

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `ingredient_id` | uuid | no |  |
| `encountered_at` | timestamp with time zone | no |  |
| `uploaded_at` | timestamp with time zone | no | `now()` |

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
