# Debate: Foodi Dex, specific goals for the next 18 days (cycle 1)

**Subject:** "What specific, measurable goals should Foodi Dex set for the next 18 days, and for the video system Alex marked 'if we can or after the deadline'?"
**Kind:** a proposal or plan. The question is what should be built, and in what shape. Nothing gets built here.
**Cycle:** 1 of a loop. Nothing has been built yet. Cycle 2 should re-run against the goals document forge writes from this transcript, not against this transcript.
**Date:** 2026-10-28, run fresh from the files listed below.

## Seats

| Seat | Why it is here |
|---|---|
| INTENT | Holds Alex's ask word for word and outranks every other seat. It must concede when it is out-argued. |
| EVIDENCE | Added because every goal has to rest on what data exists and on how accurate a calculation can be. It strikes any claim without a source. |
| PRIOR ART | Reports what the repo and the existing plans already have, using searches it actually ran. |
| ARCHITECTURE | Decides where each piece lives and who owns each fact. |
| RISK | Covers invented numbers, health and dosing (upper limits), LLM hallucination, style imitation, cost, and the security PR. |
| UX | Covers what Alex sees and does: ranges against single numbers, and the Cook view. |
| COST | Covers 18 days at about an hour a day, the accounts Alex has to create, and what gets cut. |

**Dropped: CRAFT.** No code was under review. Two points were about code: energy is not a mass unit, and the suggestion engine has to be a pure function. ARCHITECTURE carried both. No other seat was added, because RISK covered security and health and EVIDENCE covered data.

## Evidence keys

- **N1–N46**: `docs/research/2026-10-28-nutrition-data.md`. **V1–V64**: `docs/research/2026-10-28-substitution-and-video.md`. Forge re-checked N1, V20, V36 and V39 and the Remotion licence against primary sources, as the brief says.
- **[CTX]**: `00-context.md`. **[PLAN-F]**: forge's `foodi-dex-20-days-2026-10-27.html`. **[PLAN-P]**: pilot's `tools-and-foodi-dex-20-days-2026-10-27.html`, Part 3.
- **M1–M13**: read-only checks run for this debate on 2026-10-28 (psql SELECTs, grep, gh, and the USDA files downloaded during research):
  - **M1** Row counts: ingredient 15, compound 14, ingredient_compound 130 (119 with an amount), prep_effect 2 (**0 with a numeric retention factor**), recipe 1, recipe_ingredient 4, recipe_step 0, source 21, compounds with an upper limit 0, stack 0. `amount_low` and `amount_high` are filled on **0 of 130** rows.
  - **M2** Amounts exist for 8 compounds only: alpha- and beta-carotene, lycopene, lutein-zeaxanthin, vitamin K1, vitamin C (14 foods), total fat and fibre. Six compounds are linked with no amount: betanin, curcumin, nitrate, oxalate, pectin and piperine.
  - **M3** Code facts:
    - `lib/usda/nutrients.ts:15-24` maps 8 USDA nutrients.
    - `packages/epistasis/src/types.ts:5` defines `MassUnit = "g" | "mg" | "µg"`, so kcal has no unit.
    - `settings.ts:20` sets `referenceAmounts: {}`.
    - `prep.ts:8-11` lists 14 prep methods.
    - `prep.ts:47` looks up a factor by compound and method only.
    - `prep_effect` has no ingredient or food-group column (SCHEMA.md).
    - `checkExcess` (`stack.ts:36-45`) compares any total against one limit per compound.
    - `cautions.ts:30-40` turns each "over" into an excess warning.
  - **M4** `package-lock.json` has no Anthropic SDK, no LP solver (javascript-lp-solver, glpk, highs or yalps) and no Remotion. `.env.example:10` has an empty `ANTHROPIC_API_KEY`.
  - **M5** No code anywhere for DRIs, RDAs, intake goals, household measures or yields. Portion labels appear only in the seed file (`data/seed/recipes.ts:7,16-19`), and `recipe_ingredient` stores grams only.
  - **M6** There are 456 creature SVGs. 257 of them match keys in `tools/art/creatures-sr-legacy.json`, which links them to 1,092 SR Legacy fdcIds. The other **199 have no fdcId mapping**. Of the 257, **111** have at least one cooked SR Legacy entry and 131 have a raw entry.
  - **M7** Of the 15 seeded foods, 9 have at least one SR Legacy cooked entry (apple's are dried and stewed). **All 15 have at least one household portion**, but some have very few: kale has only "1 cup = 21 g".
  - **M8** A 30-nutrient panel plus retinol: every nutrient id and unit was confirmed in SR Legacy `nutrient.csv`.
    - Coverage across all of SR Legacy runs from 59.2% (choline) to 100% (energy, protein, fat, carbohydrate).
    - For the 15 seeded foods, **444 of 450 cells are filled**.
    - The 6 empty cells are Granny Smith apple's vitamin C, vitamin D, B12, folate (DFE) and saturated fat, and butternut squash's choline.
  - **M9** USDA retention CSV:
    - Vitamin A factors are given only as "RE" and "IU", not RAE.
    - Code 5005's factor cells read "Sep-75". The defect is confirmed.
    - Each of the engine's 10 cooking methods appears in at least 2 code descriptions: boiled 45, simmered 45, fried 36, baked 28, broiled 21, roasted 18, sautéed 7, steamed 5, braised 4, stewed 2. Juiced, blended and fermented appear in 0.
    - "Boiled" splits three ways. Roots: 3454 (a little water, drained), 3455 (water to cover, drained) and 3456 (water used). Greens: 3004, 3005 and 3006.
  - **M10** Open PRs:
    - #11 is a draft that touches only `package.json` and `package-lock.json`.
    - #12 is a draft.
    - #5 to #10 merged on 2026-10-27, so the 3 Week-0 review hours in the prior plan are already spent.
  - **M11** Dates:
    - 18 weekdays from Thu 10-29 ends **Mon 11-23**. From Wed 10-28 it ends Fri 11-20.
    - 18 calendar days ends Sat 11-14 or Sun 11-15, which leaves **12 weekdays** (Thu 10-29 to Fri 11-13).
  - **M12** No MacroFactor reader exists. A grep of `Health`, `fps`, `lifting-log` and `claude` found no "macrofactor", and `fps --help` lists no `stores` command.
  - **M13** `next.config.ts` has no image config, and creatures render through a plain `<img>` (`components/parts.tsx:37`). Whether advisory GHSA-2464 (an SVG reaching the Image Optimization API) is reachable is **unverified**. It doesn't change anything: per [CTX], `next build` refuses to run on 16.4.0 anyway.

---

## Round 1: positions

**INTENT.** The ask contains five deliverables and one instruction about method [CTX]:
1. "All the data entered so that all the reactions to cooking are automatic and the calculations are accessible."
2. "Put a recipe in and it figures out the end micronutrients and macros… a full estimated table of everything you will be consuming."
3. "Save your recipe."
4. "A button where it will think of ways to keep the flavor profile but help complete your intake goals for vitamins and minerals."
5. "If we can or after the deadline": a short "kurzgesagt style" video per recipe showing prep, cooking and plating. It is generated on a schedule for new recipes, and a Cook button plays it with the steps as text below.

The method instruction is "Set specific goals first," and "18 days." On a first reading I hold four things. "All the data" means anything Alex might cook. "Automatic" means every cooking effect. "Think of ways" means an AI that reasons. "Kurzgesagt style" is the look he wants.

**EVIDENCE.**
- **What exists:**
  - Raw amounts: SR Legacy covers most vitamins and minerals for 88–99% of its 7,793 foods [N27], and 444 of 450 panel cells for the seeded foods [M8].
  - Cooking: retention factors cover 26 components by food group and method, in a CC0 table of 7,018 rows [N1].
  - Calculation method: the recipe method is settled. Yield applies at recipe level and retention at ingredient level [N5, N6, N7, N8, N11].
  - Intake goals: DRI tables exist only as HTML and PDF, with no CSV [N29, N30].
- **What does not exist:**
  - USDA retention factors for protein, fat, carbohydrate, fibre, vitamins D, E and K, pantothenic acid, selenium, manganese or iodine [N1].
  - Machine-readable yields outside meat [N2 is a scanned PDF; N3 covers meat only].
  - Factors for microwaving, air-frying, pressure cooking or sous-vide [N1, N11].
  - A tasting-validated way to judge whether a swap "keeps flavour" [R2 gap 1, V13].
- **Accuracy:** calculated macros come within about 10–15% on average [N13, N16]. A single dish's micronutrients can be off by more than 50% [N16]. Folate runs high when no retention factor is applied [N17].
- **LLM numbers:** fewer than half of LLM energy values fall within ±10% [V19]. Vitamin D is off by −100%, potassium −49.5% and folate −38.6% [V20].
- **Struck:** "every reaction to cooking automatic", and any goal that claims flavour is kept.
- **Held:** where SR Legacy has an analysed cooked entry, prefer it to raw × factor [N23, N27].

**PRIOR ART.** Searches M1–M5 and M10. The seams already in the repo:
- **Compounds already hold macronutrients.** `total-fat` and `dietary-fiber` are compound rows (SCHEMA.md). A fuller panel means more compound rows plus more entries in `USDA_NUTRIENTS` [M3].
- **The seed pins foods safely.** It pins a food by fdcId plus USDA's own description and refuses a renamed food (`data/seed/ingredients.ts:2`; `scripts/seed.ts:43-46`).
- **Prep stacks.** `applyPrep` applies each method in order and records an unknown factor as unknown (`prep.ts:40-67`).
- **Totals keep their provenance.** `aggregate` already returns per-serving `contributors` and `missingFrom` (`types.ts:142-151`) and carries ranges (`aggregate.ts:19-29`).
- **Upper limits have a slot.** `compound.upper_limit_*` and `checkExcess` exist, with 0 rows filled [M1, M3].
- **Goal scoring has a slot.** `scoreGoals` reads `settings.referenceAmounts`, which is empty [M3].
- **Recipe tables exist**, with steps and step-ingredient links (SCHEMA.md).
- **Dex search** is fuzzy (README).
- **The creature house style** was approved on 2026-10-12 (`tools/art/STYLE.md`).
- **Nothing exists** for DRIs, household measures, yields, a solver, an LLM or video [M4, M5].
- **The prior plan** already has the calculator: Phase 4's builder plus live profile panel, built by forge, with Alex hand-writing the grid. Its cut order is PubMed, then Phase 5, then compare [PLAN-F].

Position: every goal extends these seams. Phase 4 *is* the calculator.

**ARCHITECTURE.**
- **What this store owns.** Food composition, retention factors and DRI reference values are reference data, and the Foodi Dex store owns them. SCHEMA.md's "Facts this store owns" section is where they get registered.
- **What it must not hold.** Alex's calorie and protein targets belong to MacroFactor [CTX], so this store keeps no copy. No reader exists for them either [M12].
- **Identity is configuration.** Life stage lives in config, never in a person row (`~/.claude/CLAUDE.md`).
- **The engine stays pure.** Food-group retention means the loader resolves a code and `prep.ts` gets an ingredient-specific lookup. Energy needs a unit, because `MassUnit` has no kcal [M3]. Any suggestion logic is an engine function that reuses `recipeProfile`.
- **Video is a separate pipeline.** Rendering cannot run inside a Vercel Function: Hobby functions stop at 300 s [V59], and Remotion's own guidance points to Sandbox, Lambda or Actions [V27].

**RISK.**
1. **Invented precision.** A "cooked" value with no factor behind it is a raw value in disguise. Calculations without retention run high [N15, N17], and N1 caps factors at 100% [N1], so an unadjusted value is an upper bound.
2. **Upper limits depend on form.** Magnesium's UL covers pharmacological agents only. Folic acid, niacin and vitamin E ULs cover synthetic forms only. Vitamin A's covers preformed vitamin A only [N30]. `checkExcess` compares any total against one number per compound [M3], so loading DRI ULs into `compound.upper_limit_*` raises false alarms.
3. **Dosing.** The button must never suggest a change that crosses a UL.
4. **LLM failure.** Wrong numbers [V19, V20, V23]. An almond-milk suggestion in a nut-free plan, with no warning [V21].
5. **Style imitation** [V49–V52].
6. **Cost of generative video.** $1.80–$24 per 60 s attempt [V37], with retry rates unpublished [R2 gap 6].
7. **Security.** #11 lands before anything runs or deploys [CTX, M10]. Saved recipes at a public URL also mean anyone can write to the database.
8. **Double counting.** DRIs already assume typical bioavailability, so absorption modifiers must not be applied to intake before it is compared with the RDA [N35].
9. **Who it serves (CLAUDE.md "what the work is for").** The button has to widen Alex's choices, with the trade-offs visible. It never pushes a supplement or a brand.

**UX.** Alex uses the builder on his phone and thinks in "2 medium carrots", not grams. Each cell should show a ± range rather than a single number that pretends to be exact. Fifteen foods is not enough to enter real recipes [M1]. The Cook view shows one step at a time, for cooking with busy hands [V55]. The video goes above the text, split per step [V53]. Suggestions should read like "+2.1 mg iron (+26% of your daily RDA)", with the trade-offs next to it.

**COST.**
- **Alex's hours.** 18 weekdays gives 18 hours [M11]. The prior plan's 3 Week-0 hours are already spent [M10], so they are free for the new asks.
- **Grid.** It keeps its 5 hours plus 1 React hour [PLAN-F].
- **Reviews are the bottleneck.** Forge's time isn't the limit, but every forge PR costs one of Alex's review hours.
- **Accounts.** Supabase and Vercel on day 1 [PLAN-F]. An Anthropic key only if an LLM is used [CTX].
- **What I would cut.** Phase 5, the compare view, the microbe and supplement screens, all video, any LLM, and the Cook view, which is video-adjacent.

---

## Round 2: collision

### Q1. What does "all the data entered" mean?

**INTENT:** It means everything I could cook, with every cooking effect automatic.

**EVIDENCE → INTENT:** Not every effect can be automatic without inventing numbers. USDA has no factors for macros, D, E, K, pantothenic acid, Se, Mn or iodine [N1]. The only source that adds them is Bognár, whose licence is unverified and whose "estimated" shading is lost when the text is extracted [N4].

**UX → INTENT:** SR Legacy has 7,793 foods [N25]. The first row of its `food.csv` is "Pillsbury Golden Layer Buttermilk Biscuits, Artificial Flavor, refrigerated dough" (read for this debate). Importing every row would bury the Dex. The Dex's own list is the 456 creatures [M6].

**PRIOR ART:** The seed path can pin all 456. That is 456 API calls, inside the 1,000-per-hour limit [N24]. Each pin carries USDA's description, so a wrong pin fails loudly.

**INTENT concedes (C1).** "That is right, and it changes what I asked for. 'All the data' for these 18 days means:
- the 456 creature foods, plus anything my recipes need, added through the same seed;
- a 30-nutrient panel;
- every USDA retention factor.

'Every reaction automatic' becomes 'every reaction USDA has a factor for is automatic, and the rest is marked so I can see it.'" *Moved by EVIDENCE (N1, N4) and UX (M6, N25).*

**EVIDENCE:** Then prefer analysed cooked entries where SR Legacy has them: 111 of the 257 mapped creatures do [M6]. For carrots, the cooked entry implies 73% vitamin C retention where USDA's factor says 65–70% [N23].

**ARCHITECTURE → EVIDENCE:**
- **Cooked entries don't fit the recipe's input.** A cooked entry is per 100 g of *cooked* food, while `recipe_ingredient` stores raw grams (SCHEMA.md).
- **Converting needs a yield or a cooked weight.** Machine-readable yields exist only for meat [N3]. AH-102 is a scan with no text layer [N2]. A measured cooked weight would do it [N10], but the recipe doesn't record one.
- **Per-serving totals need no yield.** Per serving = Σ(raw g × content × retention) / servings, which follows from the EuroFIR formula [N11].

**EVIDENCE narrows (C2).** "Agreed. Cooked entries are not an input in these 18 days. They become a cross-check: the engine's raw × factor against the analysed cooked value, the way N23 did it. That is goal 12." *Moved by ARCHITECTURE (N2, N3, N10, N11, schema).*

**ARCHITECTURE:** USDA's table is keyed by food group × method. `prep_effect` is keyed by compound × method, with no group column [M3].

**PRIOR ART:** Add a nullable `ingredient_id` to `prep_effect` and reuse the table.

**ARCHITECTURE → PRIOR ART:** That copies each of the 7,018 group-level facts once per ingredient in the group, so one fact gets stored many times. Your own rule names the requirement the existing seam cannot meet: one factor shared across a food group.

**PRIOR ART concedes (C3).** "Right. A `retention_factor` table holds N1 exactly as published, and an ingredient → code mapping per method sits beside it. `prep_effect` stays for food-specific sourced facts, such as juicing's fibre loss. My condition is one lookup in `prep.ts` (ingredient-specific first, then general) and no second prep path." *Moved by ARCHITECTURE (M3, duplication of 7,018 rows).*

**RISK:** Code 5005's factors are corrupted in the CSV [N1, M9]. The import must correct them from the PDF (alcohol 35, all others 100), and a test must pin those values. *Accepted by all seats.*

**EVIDENCE → ARCHITECTURE:**
- **Vitamin A:** USDA gives factors as RE and IU, but the panel uses RAE [M8, M9]. Applying an RE percentage to RAE is a judgement, not a sourced fact.
- **Folate:** the panel's folate is DFE, while N1 has total folate, food folate and folic acid [M9].

**ARCHITECTURE:** Mark both mappings as a basis ("mapped from RE", "computed from food folate + folic acid") rather than a measured factor.

**EVIDENCE:** I won't call that sourced. *Unresolved (U3).*

**The checkable numbers:**
- 31 panel compounds: 30 nutrients plus retinol for the vitamin A UL.
- 456 foods, each pinned or listed as unmatched.
- 7,018 retention rows.
- Every pair of ingredient × the 10 cooking methods (4,560 pairs) listed as "coded" or "no factor".

**What stays empty under the never-invent rule:**
- **D, E, K, pantothenic acid, Mn and Se after cooking.** Shown as "≤ raw amount".
- **Macros.** Not adjusted. That is standard practice, since most databases apply retention to vitamins and minerals only [N7].
- **Fat lost from meat** is not subtracted, because N3 is not imported. **Frying oil** counts in full, as Alex enters it. Fat is therefore an upper bound for fried and roasted dishes.
- **Microwave, air-fryer, pressure-cooker and sous-vide** are not offered as methods [N1, N11].
- **Amounts USDA does not have** show as missing. Example: Granny Smith apple's vitamin C [M8].
- **Iodine and biotin** are left out of the panel (SR Legacy iodine coverage is 0% [N27]).

### Q2. The calculator: inputs, outputs, ranges

**UX:** Every cell should show a ± band.

**EVIDENCE → UX:** No source gives a per-nutrient error band for calculated home recipes:
- No meta-analysis exists [R1 gaps].
- The textbook is qualitative only [N12].
- N16 gives "every nutrient below 15%" across many dishes, and "over 50%" for single foods.
- N22's −35%/+50% is a label-compliance tolerance. Presenting it as an error band misstates what it is.

**UX concedes (C4).** "Then no ± band on the cells. Each cell gets a **basis tag** instead: raw × USDA factor (with its code), not adjusted, ≤ (no factor), or missing. One note at the top of the page cites N12 and N16: macros agree within about 15% on average, and a single dish's vitamins and minerals can be off by half." *Moved by EVIDENCE (N12, N16, N22).*

**UX → EVIDENCE:** "Boiled" maps to three water-handling codes for both roots and greens [M9]. That spread comes from the data itself, not from my wish for a band.

**EVIDENCE concedes (C5).** "Yes. A range across the codes a method matches is sourced, so show it as low–high, labelled 'depends on water: a little / to cover / kept'." *Moved by UX (M9).*

**PRIOR ART:** The engine already carries ranges through `aggregate` (`aggregate.ts:19-29`). Today no amount has one [M1], so this would be the first real use.

**RISK:** "≤" must be visible, not hidden in a tooltip. Prep notes already carry `retentionFactor: null` (`prep.ts:48-62`).

**UX:** For entering amounts, grams come first, because household measures are error-prone (within ±25% of the true weight only 29% of the time in one estimation study [N46]). A food's USDA portions are offered as alternatives [N28]. All 15 seeded foods have at least one [M7]. The chosen label is stored next to the grams.

**ARCHITECTURE:** Import the SR Legacy portions for each pinned food into a table this store owns, and add a nullable portion-label column to `recipe_ingredient`. Both are additive.

**COST:** A per-100 g view of the finished dish needs the finished weight [N10], and nobody asked for it. Cut it.

**INTENT:** Agreed. "Everything you will be consuming" means per serving.

**Accessible calculations (INTENT, held):** every number can be tapped to show its fdcId, USDA nutrient id, retention code and factor. *Accepted.*

**Done-when:** a golden fixture computed by hand inside the test file must match the engine to 3 significant figures. Alex then enters 3 recipes he really cooks.

### Q3. Intake goals: source and owner

**INTENT:** By "intake goals" I mean my goals.

**ARCHITECTURE:** Calories and protein belong to MacroFactor [CTX], and nothing can read them [M12]. Foodi Dex therefore shows macro amounts with no target. Vitamin and mineral goals are DRI reference values [N29, N30], selected by life stage in config.

**INTENT concedes (C6).** "Macros are shown as amounts only for now, and I compare them in MacroFactor. The vitamin and mineral goals are DRI values for my life stage." *Moved by ARCHITECTURE (one owner per fact; M12).*

**PRIOR ART:** Put DRI values in `compound.upper_limit_*` and `settings.referenceAmounts`.

**RISK → PRIOR ART:**
- `upper_limit_*` holds one number per compound, with no life stage and no form [M3]. N30's footnotes make the form matter.
- A magnesium UL stored there would flag a spinach dish "over" through `cautions.ts:30-40`, even though that UL covers only pharmacological agents.
- Comparing RAE, which includes carotenoids, with the preformed vitamin A UL would flag carrots.
- `referenceAmounts` weights goal scores by effect (`goals.ts:28`). It is not an intake target.

**PRIOR ART concedes (C7).** "Right. A `dri` table gets life stage, kind (EAR, RDA, AI or UL), amount, unit, applies-to form and source. `UpperLimitFact` gains `appliesTo`. `compound.upper_limit_*` keeps its existing job for supplements." *Moved by RISK (N30, M3).*

**EVIDENCE:** Use Health Canada's tables, which allow non-commercial reproduction with attribution [N30]. NASEM's reuse terms are unverified [N29]. Spot-check values against the NAL calculator [N31].

**Scope:** the 8 adult groups (M and F × 19–30, 31–50, 51–70, 71+) and the 23 micronutrients in the panel. Iron and zinc need more for vegetarians [N30], so diet type is a config value too.

**RISK:** Absorption modifiers are never applied before the comparison [N35]. *Accepted.*

**UX:** The column reads "% of daily RDA/AI in one serving", because DRIs are daily.

### Q4. The "keep the flavour, meet goals" button

**INTENT:** "Think of ways" means something that reasons, an AI.

**EVIDENCE:** No LLM number can reach the screen:
- Energy falls within ±10% for at most 46.8% of foods [V19].
- Micronutrients are off by −100% to +45% [V20].
- The best model gets carbohydrate within ±7.5 g only 66.8% of the time [V23].
- A fine-tuned model picks the reference swap first only 22% of the time [V11].

**RISK:** Allergens and exclusions are filtered in code, after any model step [V21].

**COST:** No Anthropic key is set [CTX]. With Phase 5 out, the key would exist only for this button.

**INTENT → EVIDENCE, RISK:** A curated table alone is narrow:
- A lookup table finds the reference substitute in its top 10 only 47.5% of the time [V10].
- Learned models collapse on pairs they haven't seen (MRR 5.77 [V10]).
- "Think of ways" asks for breadth.

**RISK concedes (C8).** "An LLM may *propose candidates* if code owns every number and every filter. That pattern has published numbers: an optimiser placed after ChatGPT cut the energy miss to 0.00 kcal [V22]." *Moved by INTENT and V22.*

**EVIDENCE:** Neither route is tested by tasting [R2 gap 1]. Shared flavour compounds are not a flavour test [V1, V4, V5, V6, V10]. An LLM adds breadth, not proven quality.

**INTENT concedes (C9).** "The first version ships deterministic:
- swap for a food in the same Dex group;
- add a herb or spice, the tested way to keep a reformulated dish acceptable (7 of 10 reformulations kept liking [V14]);
- move in whole USDA portions [V18];
- make one change at a time, accepted or rejected [V17].

The LLM proposer is a stretch goal behind the key." *Moved by COST (no key, no hours) and EVIDENCE (R2 gap 1).*

**PRIOR ART:** No solver is in the lockfile [M4]. Listing every single change and ranking them needs none.

**ARCHITECTURE:** Add `suggestChanges` to epistasis. It runs `recipeProfile` on each candidate recipe, so every number shown is an engine number.

**RISK:**
- If any per-serving total goes past an all-sources UL, the change is rejected. Where a UL applies, the screen shows the per-serving % of it.
- When no single change can reach a target, the button says so plainly, since some targets such as vitamin D can't be met by one dish [V16].
- The button never suggests a supplement.

**UX:** The defaults:
- Alex picks up to 3 nutrients, or by default the 3 lowest %RDA/AI.
- He sees the top 3 changes, each with its nutrient gain and its trade-offs (energy, sodium).

**EVIDENCE:** "Keeps flavour" has no accepted metric [V13]. The done-when therefore *records* Alex's "would cook / wouldn't" ratings as a baseline, with no pass bar. *Accepted by INTENT.*

### Q5. Saved recipes and the Cook view

**COST:** Cut the Cook view. It is video-adjacent.

**UX → COST:** The text half is in the ask ("or you can just read it below the video"). It reads `recipe_step` rows that already exist (SCHEMA.md). Text paired with segmented video is what helped in V53. Cooking with busy hands needs one step at a time [V55].

**COST concedes (C10).** "The Cook view, text only, is in the 18 days. It costs forge time plus one of Alex's hours." *Moved by UX and INTENT (V53, V55).*

**PRIOR ART → UX:** A Cook view risks becoming a second recipe renderer next to the grid.

**UX → PRIOR ART:** A grid with one column per step does not fit one-step-at-a-time cooking on a phone [V55]. The grid is also Alex's hand-written piece, and forge does not touch it [PLAN-F].

**PRIOR ART narrows (C11).** "Allowed as a second *presentation* only. It reads the same rows through the same loader (`lib/db/engine-input.ts`), with no second data path." *Moved by UX.*

**RISK:** Saving at a public URL means anonymous writes.

**COST:** Then keep writes local-only.

**UX → COST:** Alex's acceptance test for the calculator is entering recipes on his phone at the public link.

**COST concedes (C12).** "A write gate is in scope: one secret in an environment variable, server-side, no new dependency, and a 401 for anyone without it." *Moved by UX and RISK.*

**EVIDENCE:** Whether Supabase exposes these tables through its own generated API was not researched. This is an **unverified gap**. Check it before deploying.

**ARCHITECTURE:** The step text is the canonical content. A future video must present nothing beyond it, and then it counts as a media alternative for text, which needs no captions [V56, V57].

### Q6. The video system

**INTENT:** "If we can," I want it now, in the kurzgesagt style.

**RISK → INTENT:**
- Copyright doesn't protect a style, but passing off and unfair competition can apply [V49].
- OpenAI refuses prompts that ask for the style of a living artist [V50].
- The studio is publicly harmed by AI look-alikes [V51] and has published no permission [V52].
- Foodi Dex already has an approved flat house style: flat fills, one highlight, no gradients (`tools/art/STYLE.md`).

**INTENT concedes (C13).** "That is right, and it changes what I asked for. The look is *the Foodi Dex house style*, flat vector, built from our own creatures. The studio is never named in the UI, a prompt or a post." *Moved by RISK (V49–V52) and STYLE.md.*

**EVIDENCE:** Generative video is out:
- Sora's API is shut down [V39], and the Veo 3.1 preview is shut down [V36].
- GA Veo 3.1 lists a retirement date of "Nov 17 2026 or later" [V38].
- Character consistency is documented for one subject only [V38], Omni makes no consistency claim at all [V35], and the multi-character feature that once existed is retired [V40].
- A 60 s attempt costs $1.80–$24 [V37], and how many retries a usable clip takes is unknown [R2 gap 6].

The only supported route is programmatic: Remotion, free for individuals [V25], with SVG parts animatable as React components [V33].

**COST → INTENT:**
- Video gets none of Alex's 18 hours.
- How long a render takes, and how much CPU it uses, has not been measured [V28, R2 gap 4].
- Remotion would be a new dependency [M4].

**INTENT narrows (C14).** "Video comes after the deadline. 'If we can' becomes a forge spike, allowed only if goals 0–10 have landed by day 14. The spike is one MP4, with its render time measured." *Moved by COST and EVIDENCE.*

**UX:** The goal should be that the video makes the recipe clearer. The cooking-show trial found knowledge rose but eating behaviour didn't change [V54].

**EVIDENCE:** Then no goal may claim the video changes behaviour.

**UX concedes (C15).** "The done-when for the video is about matching the text and being understood, not about cooking outcomes." *Moved by EVIDENCE (V54).*

**ARCHITECTURE:** Design the `recipe_video` table in SCHEMA.md now.

**COST → ARCHITECTURE:** SCHEMA.md's rule is to design a table before building it, and the build is after the deadline. A table designed now for a pipeline whose render cost is unmeasured is a speculative schema.

**ARCHITECTURE concedes (C16).** "No video table in these 18 days. It gets designed when the spike's numbers exist." *Moved by COST (CLAUDE.md "No speculative guards", V28 gap).*

**ARCHITECTURE, on the schedule after the deadline:**
- Vercel Hobby cron runs at most once a day [V58]. Its function should only enqueue the job [V59] and start a Sandbox render [V27, V28].
- Another option is a scheduled GitHub Actions run [V64].
- pg_cron keeps run history [V60], but free projects pause after a week without activity [V63].
- Pick one after measuring a render.

**RISK:** Every run's outcome is recorded, and a failure shows on the recipe (fail loud).

### Q7. Order, dates, blockers

**COST:** The dependency chain:
- #11 lands first [CTX].
- #12 lands before the deploy.
- Accounts on day 1.
- Data and DRIs before the calculator.
- The grid is built against a fixture in parallel [PLAN-F].

**PRIOR ART:** The prior plan's Week 2 (grid) and Week 3 (Phase 4) hold. The changes: data and DRIs go before the builder, and the button and Cook view take Phase 5's place.

**RISK:** Split the data work into two PRs: panel plus foods, then retention plus DRI. A single PR with 456 mappings and 7,018 rows can't be reviewed in an hour. Inside each PR, commit and push one small part at a time, as Alex now asks [CTX].

**RISK, on the food mappings:** Alex checks a random 30 of the food mappings against the FDC site. If 3 or more are wrong, forge re-checks all 456 before the PR lands. (This threshold is a design choice. Free-text matching was 71.6% right in N45, but curated names are untested.) *Accepted by COST.*

**INTENT:** The grid stays. It is the piece Alex can say he built, for the 11-24 show [PLAN-P].

**COST:** Phase 5, compare, and the microbe and supplement screens are cut.

**INTENT:** None of those three is in the new ask. On 10-27 Alex said "the rest" [PLAN-F], so the cut is **his decision**, not the debate's.

### Q8. What "18 days" means

**EVIDENCE:** 18 weekdays from Thu 10-29 ends Mon 11-23, the day before the 11-24 show [M11]. That is exactly what remains of yesterday's 20-weekday plan [PLAN-F]. This is consistent with a weekday reading, but it is an **inference**, not something Alex said.

**COST:** If he meant calendar days, the deadline is Sun 11-15 and there are 12 hours [M11]. The grid (5 hours) and the button (review plus rating, 2 hours) don't both fit alongside the core work.

**INTENT:** I won't pick between his learning piece and his feature. *Unresolved (U1) → decision for Alex.*

---

## Round 3: INTENT rules

**Accepts with amendments.**

Changes to the ask, recorded rather than hidden:
- **C1.** "All the data" means 456 foods × 31 panel compounds × USDA factors. Unfactored nutrients are visibly marked.
- **C6.** Macros have no targets. MacroFactor owns them.
- **C9.** The button is deterministic first, with an LLM as a stretch.
- **C13.** The look is the Foodi Dex house style, not a studio's.
- **C14.** Video comes after the deadline, apart from a gated spike.

Points INTENT holds, and the transcript carries them:
- **"Calculations are accessible."** Every cell can be tapped to show its fdcId, nutrient id, retention code and factor. This is part of goal 6's done-when.
- **The button.** It is one of the five things Alex asked for, so it may be narrowed but not cut while the deadline means weekdays.
- **The grid stays.**

**Objection: none unmet.** The one open conflict, grid against button if "18 days" means calendar days, belongs to Alex.

---

## Close

**Decided:**
- Data is three PRs' worth: a 31-compound panel, 456 pinned foods with their USDA portions, and USDA Release 6 retention imported whole and mapped per ingredient × method. Cooked SR entries become a cross-check.
- Each calculator cell carries a basis tag. Ranges appear only where codes disagree. There is one accuracy note. Results are per serving, and every number can be tapped back to its sources.
- DRI reference values live in a `dri` table, chosen by life stage and diet in config. Each UL records the form it applies to. Macros are shown with no targets.
- The suggestion button is deterministic and single-change. Every number comes from the engine, UL crossings are rejected, and it says plainly when a target can't be reached. Alex's ratings are recorded as a baseline.
- Saved recipes sit behind a write gate. A text Cook view reads the same rows as the grid.
- Video is programmatic, in the house style, after the deadline, with a gated spike allowed.
- Generative video is out.

**Conceded: 16, all recorded above.**

| # | Who conceded | What they conceded | What moved them |
|---|---|---|---|
| C1 | INTENT | "All the data" is narrowed to what has a source | EVIDENCE, UX |
| C2 | EVIDENCE | Cooked entries become a cross-check, not an input | ARCHITECTURE |
| C3 | PRIOR ART | A new retention table is justified | ARCHITECTURE |
| C4 | UX | No ± bands on cells | EVIDENCE |
| C5 | EVIDENCE | Ranges across codes are shown | UX |
| C6 | INTENT | Macros have no targets | ARCHITECTURE |
| C7 | PRIOR ART | A DRI table with UL forms | RISK |
| C8 | RISK | An LLM may propose candidates | INTENT |
| C9 | INTENT | The first version is deterministic | COST, EVIDENCE |
| C10 | COST | The Cook view is in | UX, INTENT |
| C11 | PRIOR ART | The Cook view is allowed, on the same loader | UX |
| C12 | COST | The write gate is in | UX, RISK |
| C13 | INTENT | House style instead of the studio's | RISK |
| C14 | INTENT | Video comes after the deadline | COST, EVIDENCE |
| C15 | UX | Video goals make no behaviour claim | EVIDENCE |
| C16 | ARCHITECTURE | No video table yet | COST |

**Unresolved:**
- **U1.** Weekdays or calendar days. Under the calendar reading, grid against button. → Alex.
- **U2.** Phase 5, compare, and the microbe and supplement screens: out? → Alex.
- **U3.** The vitamin A RE→RAE mapping and the folate → DFE mapping. EVIDENCE does not accept either as sourced, and ARCHITECTURE labels both as mappings. Stays open until a primary source is read.
- **U4.** Bognár, which would add macro, D/E/K and fat-uptake factors: its licence is unverified [N4]. Until it is resolved, those values stay "≤".
- **U5.** "Keeps flavour" has no validated metric [V13, R2 gap 1]. Only a baseline can be measured.
- **U6.** Whether Supabase's generated API exposes these tables. Not researched.
- **U7.** Video render cost [V28, R2 gap 4], and Supabase free-tier pausing for pg_cron [V63].

---

## Goals

Days are weekdays: D1 = Thu 10-29 through D18 = Mon 11-23, with the show on Tue 11-24 [M11]. Forge works in parallel. The day given is when the goal is checked.

0. **The security patch lands before anything runs or deploys.**
   - Done when: #11 is merged to main, and on main `npm ls next` shows 16.4.3 and `npm run build` succeeds.
   - Evidence: [CTX], M10. Owner: Alex approves, shepherd lands. **D1 (Thu 10-29).**
1. **Phase 3 lands and the Dex is live at a public URL.**
   - Done when: #12 is merged, and the carrot → beta-carotene → skin colour → pumpkin walk passes on Alex's phone at the public link.
   - Evidence: [CTX], [PLAN-F]. Owner: Alex reviews (D2–D3) and creates Supabase and Vercel on D1; shepherd lands; forge deploys. **D5 (Wed 11-04).**
2. **A 30-nutrient panel plus retinol is imported for every food.**
   - Done when:
     - `select count(*) from compound where slug in (<31 slugs>)` returns 31.
     - Each slug is in `USDA_NUTRIENTS` with the name and unit guard.
     - Energy is stored in kcal, and `convert()` throws on kcal ↔ mass. That test is written first and seen failing.
     - The 15 seeded foods fill 444 of 450 cells, and the 6 empty cells show "missing".
   - Evidence: N25, N27, M3, M8. Owner: forge; Alex reviews. **D4 (Tue 11-03).**
3. **The Dex has 456 pinned foods, each with its USDA household portions.**
   - Done when:
     - Every creature food is either an ingredient with an fdcId and USDA description, or listed in the PR as "no SR Legacy match" with the reason. The two counts add up to 456.
     - Alex's random sample of 30 mappings has fewer than 3 errors, or else all 456 are re-checked.
     - Portions are imported for each pinned food.
     - A food Alex needs that isn't there is added through the seed within 1 day.
   - Evidence: N24, N28, N45, M6, M7. Owner: forge maps; Alex samples. **D4 (Tue 11-03).**
4. **USDA retention Release 6 is imported whole and mapped per ingredient × method.**
   - Done when:
     - `retention_factor` holds 7,018 rows, with code 5005 corrected from the PDF and pinned by a test.
     - A query lists all 4,560 pairs (ingredient × the 10 cooking methods) as "coded" or "no factor". No pair has a factor without a code and a source.
     - Engine tests, written first: kale boiled uses a greens code, carrot boiled uses a roots code, and the ingredient-specific factor beats the general one in `prep.ts`.
   - Evidence: N1, N7, N11, M3, M9. Owner: forge; Alex reviews. **D6 (Thu 11-05).**
5. **Intake goals: DRI values for the 8 adult life stages and 23 micronutrients, each UL with its form.**
   - Done when:
     - 10 spot values match Health Canada [N30]: vitamin C, males 19–30, RDA 90 mg and UL 2,000 mg; iron, males 19–30, RDA 8 mg and UL 45 mg; iron, females 19–30, RDA 18 mg; and so on.
     - Life stage and diet are set in config.
     - A spinach-heavy test recipe raises no magnesium "over", and a carrot recipe raises no vitamin A "over".
     - Grep finds no stored calorie or protein target.
   - Evidence: N29, N30, N31, N35, M3, M12. Owner: forge; Alex confirms life stage. **D6 (Thu 11-05).**
6. **Recipe calculator: put a recipe in, get a per-serving table of all 30 nutrients.**
   - Inputs: Dex search; grams or a USDA portion; method per ingredient or step; servings.
   - Each cell shows: amount, basis tag, low–high where codes disagree, % of daily RDA/AI, UL status where a UL applies, top contributor, and on tap its fdcId, retention code and factor. There is one accuracy note.
   - Done when:
     - A golden fixture computed by hand in the test file (200 g boiled carrot, 100 g boiled kale and 10 g olive oil, 2 servings) matches the engine to 3 significant figures on every nutrient. Written first.
     - Alex enters 3 recipes he cooks at the public link, and the minutes each took and any food not found are recorded.
   - Evidence: N1, N5–N11, N12, N16, N27, N28, N46, M7, M9. Owner: forge builds; Alex reviews D12 and accepts D13. **D13 (Mon 11-16).**
7. **Saved recipes, behind a write gate.**
   - Done when:
     - A created recipe reloads identically, ingredients, labels, methods and steps included.
     - An unauthenticated write gets a 401 (checked with curl).
     - The grid and the calculator render from the same saved rows (Phase 4's own done-when).
   - Evidence: SCHEMA.md, [CTX]. Owner: forge; shepherd lands. **D13 (Mon 11-16).**
8. **Alex hand-writes the recipe grid.**
   - Done when: ingredients are rows and steps are columns, each step's cell spans the ingredients it uses, the gap-case test passes, and the PR is open.
   - Evidence: repo CLAUDE.md, [PLAN-F], [PLAN-P]. Owner: Alex. **D11 (Thu 11-12).**
9. **A text Cook view.**
   - `/recipes/<slug>/cook` shows one step at a time, with the ingredients the step touches, their amounts and a timer when one is set. It reads the same loader as the grid and shows no video element until a video exists.
   - Done when: a component test renders steps in order with their ingredients, and Alex cooks one saved recipe from his phone with only next, back and the timer, logging any problems.
   - Evidence: V53, V55, V56, V57. Owner: forge; Alex accepts. **D15 (Wed 11-18).**
10. **Suggestion button, deterministic version.**
    - For up to 3 chosen nutrients, it returns up to 3 single changes: a same-group swap, an added herb, spice or vegetable portion, or one more portion of an existing ingredient. They are ranked by engine-computed gain, and the trade-offs are shown.
    - Done when, in engine tests written first:
      - every number equals `recipeProfile` run on the changed recipe;
      - no change crosses an applicable UL per serving;
      - a vitamin D target on a vegetable dish returns "can't reach from this recipe";
      - no suggested ingredient comes from outside the Dex.
    - Alex then rates the top 3 on 3 saved recipes ("would cook / wouldn't") and cooks one. The rate is recorded as a baseline with no pass bar.
    - Evidence: V7, V10, V14, V16, V17, V18, V19–V23, N30, N35, M4. Owner: forge; Alex reviews D14 and rates D16. **D16 (Thu 11-19).**
11. **Stretch: an LLM candidate proposer behind goal 10's gates.**
    - Done when: goal 10's tests pass on a stubbed model reply that contains an unknown slug, a number and an allergen, and all three are removed. Alex rates LLM candidates alongside goal 10's on the same recipes.
    - Needs an Anthropic key in `.env.local` by D12.
    - Evidence: V11, V19–V22, M4. Owner: forge; Alex provides the key. **D17 (Fri 11-20).**
12. **Stretch: an accuracy cross-check.**
    - For each pinned food with both raw and boiled or baked SR Legacy entries, compare raw × USDA factor with the analysed cooked value on a dry-weight basis, for USDA's nutrients.
    - Done when: a script run on the pinned files reproduces a table of median and worst gap per nutrient, linked from the Sources page.
    - Evidence: N23, N27, M6. Owner: forge. **D17 (Fri 11-20).**
13. **Video spike, only if goals 0–10 have landed by D14.**
    - One saved recipe is rendered to MP4 locally with Remotion, built from `recipe_step` rows and creature SVGs, with no narration.
    - Done when: each scene's text equals its step text exactly, and render time and CPU-minutes are recorded in the PR.
    - Evidence: V25, V26, V27, V28, V33, V56, V57, M4. Owner: forge. **D18 (Mon 11-23).**
14. **After the deadline: video v1.**
    - Scenes for prep, cook and plate are driven by each step's method, in the Foodi Dex house style, never named after a studio.
    - Recipes whose steps changed are re-rendered nightly. The trigger is chosen from goal 13's measurement: GitHub Actions [V64], or Vercel cron → Sandbox [V58, V27].
    - Each run's outcome is recorded, with a table designed in SCHEMA.md first. The Cook view plays the video above the steps, labelled as an alternative to the text.
    - Done when: a recipe saved at 21:00 has its video by the next morning, and a forced failure shows in the run record and on the recipe.
    - Evidence: V25–V28, V33, V49–V52, V56–V60, V63, V64. Owner: forge; Alex approves the style. **After 11-24.**

**Alex's 18 hours:**

| Day | Date | Alex's hour |
|---|---|---|
| D1 | Thu 10-29 | Approve #11; create Supabase and Vercel; paste the database URL |
| D2 | Fri 10-30 | Review #12, part 1 |
| D3 | Mon 11-02 | Review #12, part 2 (shepherd lands it; forge deploys) |
| D4 | Tue 11-03 | Data PR A: sample 30 food mappings |
| D5 | Wed 11-04 | Phone walk at the public link |
| D6 | Thu 11-05 | Data PR B: DRI spot checks; confirm life stage and diet |
| D7–D11 | Fri 11-06 to Thu 11-12 | Grid 1–5 (PR open by D11) |
| D12 | Fri 11-13 | Review the calculator and saving PR |
| D13 | Mon 11-16 | Enter 3 real recipes |
| D14 | Tue 11-17 | Review the suggestion PR |
| D15 | Wed 11-18 | Review the Cook view, then cook with it |
| D16 | Thu 11-19 | Rate suggestions; cook one |
| D17–D18 | Fri 11-20, Mon 11-23 | Spare, or review stretch goals |

The prior plan's four posts (+15 min each) fit on D3, D11, D13 and D17.

## Cut lines (first to go)

1. Goal 13, the video spike.
2. Goal 11, the LLM proposer. The Anthropic key isn't needed without it.
3. Goal 12, the accuracy cross-check.
4. Already out pending Alex: Phase 5 (Ingest), the compare view, and the microbe and supplement screens.
5. Goal 3 narrows: from 456 foods to the 257 already mapped plus whatever Alex's recipes need [M6].
6. Goal 10 narrows to same-group swaps only.
7. Goal 9 narrows to text steps only (no timer or amounts).

**Never cut:**
- Goal 0.
- Goal 5's UL forms.
- Goal 7's write gate.
- The never-invent rule.
- The core of goals 2, 4 and 6.
- Goal 8: only Alex can cut it, and only under the calendar-days reading.

**Checkpoints:**
- **D6:** if data PR B isn't open, apply cuts 1–5.
- **D12:** if the calculator PR isn't open, apply cuts 1–6 and move goal 9 to D17.

## Decisions for Alex

1. **"18 days":** 18 weekdays, ending Mon 11-23 with the show on 11-24 (this plan), or 18 calendar days, ending Sun 11-15 with 12 hours? If calendar days, choose between the grid (yours, 5 hours) and the suggestion button. Both don't fit.
2. **Ingest, compare, microbes and supplements:** are Phase 5, the compare view, and the microbe and supplement screens out of the 18 days? The new ask doesn't include them. On 10-27 you said "the rest".
3. **Your goals:** your life stage (sex and age band) and diet (vegetarian raises the iron and zinc goals [N30]), set as config. Are DRI defaults your vitamin and mineral goals, or do you have targets from a clinician?
4. **LLM:** should the button use one for candidate ideas (goal 11; Anthropic key by Fri 11-13, billed per call), or stay deterministic for now?
5. **Accounts:** create Supabase and Vercel on Thu 10-29. Everything live waits on them.
6. **Video style:** do you approve "Foodi Dex house style, flat vector, our creatures, never named after a studio"? And should video v1 be silent with on-screen step text, so no captions are needed, or narrated, which brings a captions duty [V56]?

## Format notes (evidence about the debate format)

- **Collisions per question.** Eight sub-questions made Round 2 long, and running it question by question kept every collision traceable. The skill doesn't say how to handle a multi-question subject. One line ("for a multi-part subject, collide per part") would cover it.
- **PRIOR ART lost to its own rule.** It argued for reuse three times (C3, C7, C11). Twice it conceded *against* reuse, because CLAUDE.md's own clause ("say which requirement the existing seam cannot meet") was met. The skill frames PRIOR ART as reuse-first and doesn't anticipate it losing on the rule it holds.
- **INTENT conceded five times** (C1, C6, C9, C13, C14), and each was recorded as a change to the ask, as the skill requires. That worked as written.
- **CRAFT was dropped** and nothing was lost. The two code-shaped points fit under ARCHITECTURE.
- **The "Goals" close came from the caller,** not the skill. For a proposal, closing with checkable goals plus owner and day was the most usable part. Consider adding it to the skill for "a proposal or plan".
- **Format.** This transcript is Markdown because the caller asked for that path. Alex's standing rule is that plans ship as annotatable HTML, so the Goals, Cut lines and Decisions should go into that format before he marks them up. Cycle 2 should debate that document.
- **One-line seats.** No seat was silent, but COST and INTENT carried most of Q7–Q8. UX and ARCHITECTURE had one line each there.
