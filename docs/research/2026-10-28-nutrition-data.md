# R1: Nutrition data evidence base for Foodi Dex (cooking, recipes, intake goals)

Researched 2026-10-28. Every source below was opened in this session. Where a publisher page blocked the fetcher (HTTP 403), the block says which mirror or record was used instead. "Abstract only" means only the abstract was read. "Measured" means I downloaded the official file and counted it myself. The counting scripts and raw downloads were working files and are not kept in the repo.

Strength labels:
- **official dataset**: a government data release.
- **official documentation**: the method write-up from the body that publishes the data.
- **technical report**: a project deliverable, not peer-reviewed.
- **study (N=…)**: peer-reviewed primary research.
- **review/chapter**: a secondary summary.
- **regulatory guidance**.
- **derived measurement**: my own count or calculation from official files. These can be reproduced.

---

## A. Cooking data: retention factors and weight yields

### N1: USDA Table of Nutrient Retention Factors, Release 6 (2007)
- Citation: USDA ARS Nutrient Data Laboratory (Dec 2007). *USDA Table of Nutrient Retention Factors, Release 6.* Beltsville, MD.
- Link: https://catalog.data.gov/dataset/usda-table-of-nutrient-retention-factors-release-6-2007. The Ag Data Commons record (https://agdatacommons.nal.usda.gov/articles/dataset/USDA_Table_of_Nutrient_Retention_Factors_Release_6_2007_/24660888/1) returned 403, so files came from its figshare links: PDF https://ndownloader.figshare.com/files/44488751, CSV https://ndownloader.figshare.com/files/44488754, data dictionary https://ndownloader.figshare.com/files/44488757.
- Strength: official dataset.
- Finding:
  - The PDF says the table has "retention factors for 16 vitamins, 8 minerals, and alcohol for approximately 290 foods."
  - Factors are reported to the nearest 5%, and anything above 100 is capped at 100.
  - Licence on data.gov: CC0 1.0. Metadata last updated 2025-11-22. The CSV was converted from the web text on 2017-11-16.
  - Measured from the CSV and PDF:
    - 270 retention codes, 7,018 rows, 13 SR food groups. Vegetables have 53 codes, fish/shellfish 40, pork 38, beef 26, lamb/veal/game 23, legumes 19, cereal grains/pasta 14, dairy/egg 13, poultry 13, fruits 13, beverages 10, breakfast cereals 4, nuts/seeds 4.
    - The 26 components are: Ca, Fe, Mg, P, K, Na, Zn, Cu, vitamin A (IU and RE), β-carotene, α-carotene, β-cryptoxanthin, lycopene, lutein+zeaxanthin, vitamin C, thiamin, riboflavin, niacin, B6, total folate, folic acid, food folate, B12, choline and alcohol.
    - Factors range from 10 to 100. 2,620 of 6,994 numeric values are 100.
    - Method words in the descriptions: simmered 37, fried 31, baked 28, boiled 28, reheated 28, broiled 21, stir-fry 11, roasted 8, steamed 5, braised 4. No code mentions microwaving.
  - Release 6 only added choline. The other 25 components are unchanged from earlier releases, and Release 1 was the 1982 provisional table. No newer release turned up in a search on 2026-10-28.
- Design implication: retention for about 24 vitamins and minerals, by food group × method, can be imported as one CC0 table keyed by `Retn_Code`. That covers most of the "cooking reactions are automatic" goal for those nutrients.
- Caveats:
  - The table has no factors for protein, fat, carbohydrate, fibre, vitamins D, E or K, pantothenic acid, selenium, manganese or iodine.
  - The factors are group averages, not food-specific values.
  - Measured CSV defects:
    - The 24 rows for code 5005 have their columns shifted, so the factor cell reads "Sep-75". The PDF has the correct values (alcohol 35, all others 100).
    - Every row's undocumented `Date` column reads "Sep-75".
  - The PDF's own worked example says "boiled greens is 85%" for vitamin C. The table gives 55–70 for boiled greens, and 85 only for stir-fry.

### N2: Agriculture Handbook No. 102, *Food Yields Summarized by Different Stages of Preparation* (rev. 1975)
- Citation: Matthews RH, Garrison YJ (rev. Sept 1975). *Food Yields Summarized by Different Stages of Preparation.* USDA Agriculture Handbook No. 102.
- Link: https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/ah102.pdf. This URL is cited in the FNDDS documentation (N5). The HathiTrust record https://catalog.hathitrust.org/Record/006685489 returned 403.
- Strength: official documentation (historic).
- Finding (measured):
  - The file is a 139-page **scanned image PDF with no text layer**: `pdftotext` returns nothing.
  - Table 1, "Yields and losses or gains in preparation of foods (percent by weight)", runs pp. 6–131. Its items are numbered up to 2894.
  - Each item gives the yield after preparation (average and range) and the loss or gain by component (for example liquid, skin, seeds).
  - The appendix has worked yield calculations.
- Design implication: this is the USDA source FNDDS uses for moisture change in non-meat dishes. Using it for vegetables, grains or legumes means transcribing or OCR-ing it by hand, item by item.
- Caveats: the data are from 1975. The table gives total weight change, not separate water and fat change. No licence statement appears on the PDF; public-domain status as a US federal work is inferred, not verified.

### N3: USDA Table of Cooking Yields for Meat and Poultry, Release 2 (2014)
- Citation: Roseland JM, Nguyen QV, Williams JR, Patterson KY, Showell BA, Pehrsson PR (2014). *USDA Table of Cooking Yields for Meat and Poultry, Release 2.* USDA ARS NDL.
- Link:
  - PDF: https://ars.usda.gov/ARSUserFiles/80400535/Data/retn/USDA_CookingYields_MeatPoultry02.pdf
  - Catalog: https://catalog.data.gov/dataset/usda-table-of-cooking-yields-for-meat-and-poultry
  - CSV: https://ndownloader.figshare.com/files/43365402
  - Dictionary: https://ndownloader.figshare.com/files/43365405
- Strength: official dataset.
- Finding:
  - Gives cooking yield %, n, SD, minimum and maximum, moisture gain/loss % and fat gain/loss % per cut and method. Formulas: yield = 100 × Wcooked/Wraw; moisture change = 100 × ((Nc × Ec) − (Nr × Er))/Wraw.
  - Measured: 173 rows (beef 66, pork 58, poultry 35, lamb/veal/game 12, sausages 2).
  - 16 rows come from AH-102 (release year 1975). The data dictionary says these have no moisture/fat change, n or SD.
  - The most common methods are "Baked or Roasted, unspecified" (36) and "Broiled or Grilled" (30).
  - Licence: CC0.
- Design implication: this is the only machine-readable USDA source of water and fat change on cooking, and it covers meat and poultry only.
- Caveats: cut-specific, run under lab cooking protocols. It does not cover vegetables, grains, legumes, eggs or fish.

### N4: Bognár (2002), weight yield and retention factor tables
- Citation: Bognár A (2002). *Tables on weight yield of food and retention factors of food constituents for the calculation of nutrient composition of cooked foods (dishes).* Berichte der Bundesforschungsanstalt für Ernährung, BFE-R-02-03. Karlsruhe.
- Link: https://publikationen.bibliothek.kit.edu/9642002/1928 (PDF, 98 pages, text-extractable)
- Strength: technical report from a federal research centre. EuroFIR (N7) treats it as the primary reference.
- Finding:
  - Coverage: weight yield factors for "about 700 foods and dishes" and average retention factors for "about 39 typical food (dish) categories".
  - Retention covers protein, fat, carbohydrate, fibre, minerals, vitamins D, E and K, B vitamins, vitamin C and amino acids. It also gives **fat uptake** for frying (raw potato: pan-fry 4.00 g and deep-fry 5.00 g per 100 g of ingredient) and salt absorption.
  - Reliability by nutrient: values for protein, fat, carbohydrates, vitamins, minerals, salt, Na, K, Mg, Ca, P and Fe are "statistically approved". Niacin, biotin, folate, pantothenic acid, B12, E and K are "estimated". Where no data exist, a factor of 1.0 is "preliminarily recommended". Shading marks the estimated and placeholder values, and that shading is lost when the text is extracted.
- Design implication: this is the only open source that adds yields for non-meat dishes and retention for macros and D/E/K. Importing it means parsing PDF tables, and each value needs an "estimated" or "placeholder 1.0" flag.
- Caveats: German household cooking. Licence not stated (unverified). The grey "estimated" marking does not survive text extraction, so it has to be checked visually.

### N5: FNDDS 2021–2023 documentation (USDA recipe method)
- Citation: USDA ARS Food Surveys Research Group (2024). *Food and Nutrient Database for Dietary Studies 2021–2023: Documentation.*
- Link: https://ars.usda.gov/ARSUserFiles/80400530/pdf/fndds/2021_2023_FNDDS_Doc.pdf
- Strength: official documentation.
- Finding:
  - Scale: 5,432 foods and beverages. About three-quarters of the profiles come from recipe calculation. Every code has a complete set of energy plus 64 nutrients.
  - Retention factors from N1 are applied at **ingredient level**. Moisture change is applied at **recipe level**, informed by AH-102 (N2). Since 2015–16, fat change is built into the ingredients rather than applied as a separate factor.
  - The method follows Powers & Hoover (1989).
  - There are about 22,000 portion weights.
  - "Only 40% of the nutrient values are truly Foundation Food values." The other 60% were filled from SR Legacy, similar foods, calculation or assumed zero.
- Design implication: Foodi Dex's engine can copy this algorithm directly (ingredient-level retention, then recipe-level moisture). FNDDS also has a MoistAdjust table of per-dish moisture changes that could serve as sourced dish yields.
- Caveats: FNDDS "recipes" stand for generic dish types, not a user's own recipe. Portion weights "may not account for all sizes".

### N6: EuroFIR proposal for harmonising recipe calculation (2007)
- Citation: Reinivuo H, Laitinen K (2007). *Proposal for the harmonisation of recipe calculation procedures.* EuroFIR WP2.2, D2.2.12/M2.2.4. KTL, Finland.
- Link: https://www.eurofir.org/how-do-recipes-and-composite-foods-come-to-their-nutritional-values/wp-content/uploads/Final_recipe_calc_harmonisation.pdf
- Strength: technical report.
- Finding:
  - Describes the INFOODS, British, yield-factor, retention-factor, summing, Bognár–Piekarski and EPIC methods.
  - The compiler network "estimated that there is more difference between calculated and analysed values than between calculation methods". It therefore chose the most common procedure: **yield factor at recipe level, retention factors at ingredient level**.
  - Few validation studies exist that compare calculated values with analysis directly.
- Design implication: pick one method (recipe-level yield, ingredient-level retention) and spend effort on input quality rather than on comparing methods.
- Caveats: the procedure was chosen by consensus, not by validation.

### N7: EuroFIR D2.2.9, rules for recipe calculation with yield and retention factors (2008)
- Citation: Vásquez-Caicedo AL, Bell S, Hartmann B (2008). *Report on collection of rules on use of recipe calculation procedures including the use of yield and retention factors for imputing nutrient values for composite foods.* EuroFIR D2.2.9.
- Link: https://www.eurofir.org/wp-content/uploads/2017/05/D2.2.9_recipe_calculation.pdf (184 pages)
- Strength: technical report.
- Finding:
  - Restates the recommendation: "Weight yields should be applied at recipe level; nutrient retention factors should be applied at ingredient level".
  - Most European databases "use retention factors only for vitamins, minerals and trace elements". They borrow them mainly from Bognár (2002), McCance & Widdowson, USDA and the Danish database.
  - Bognár was "used as a guide". A priority list maps cooking methods (LanguaL facet G) to factor sources.
- Design implication: keying cooking methods to LanguaL-style codes, with a fallback order of sources, gives a sourced answer for most method × food-group pairs.
- Caveats: the document is marked confidential (CO) on its cover but is posted publicly by EuroFIR.

### N8: Reinivuo, Bell & Ovaskainen (2009), harmonisation in European databases
- Citation: Reinivuo H, Bell S, Ovaskainen ML (2009). Harmonisation of recipe calculation procedures in European food composition databases. *J Food Compos Anal* 22(5):410–413.
- Link: https://doi.org/10.1016/j.jfca.2009.04.003 (abstract read via the Europe PMC REST API)
- Strength: peer-reviewed methods paper. **Abstract only.**
- Finding: the review found that the most common European method applies yield at recipe level and retention at ingredient level, and adopted it as the EuroFIR standard.
- Design implication: same as N6. This is the citable journal version.
- Caveats: abstract only.

### N9: Powers & Hoover (1989), calculating recipes with computers
- Citation: Powers PM, Hoover LW (1989). Calculating the nutrient composition of recipes with computers. *J Am Diet Assoc* 89(2):224–232.
- Link: https://doi.org/10.1016/s0002-8223(21)02100-3 (abstract via Europe PMC; PMID 2915095)
- Strength: study (4 pork recipes, modelled). **Abstract only.**
- Finding: compared the yield-factor, retention-factor, summing and simplified-retention methods. They gave identical results for some recipes. "Summing-raw" gave the highest water and the lowest values for most nutrients. "A superior method or methods was not identified"; the yield-factor and retention-factor methods were recommended.
- Design implication: summing raw ingredients without a yield step misstates per-100 g values of a cooked dish. The engine needs a yield step.
- Caveats: abstract only. Small, model-based.

### N10: Bognár & Piekarski (2000), guidelines for recipe information and calculation
- Citation: Bognár A, Piekarski J (2000). *J Food Compos Anal* 13(4):391–410.
- Link: https://doi.org/10.1006/jfca.2000.0922 (abstract via Europe PMC)
- Strength: methods paper. **Abstract only.**
- Finding: the best agreement between analysed and calculated values comes when changes in weight and nutrients during cooking are accounted for. The calculation needs three inputs: the quantity of ingredients for 100 g of the ready dish, nutrient content per 100 g of edible ingredient, and retention factors.
- Design implication: the recipe input must capture what was cooked, how, and ideally the finished weight. A measured cooked weight beats a borrowed yield.
- Caveats: abstract only. No error numbers in the abstract.

### N11: EuroFIR recipe calculation guideline for food business operators
- Citation: EuroFIR AISBL (no date on the PDF; described in Machackova et al. 2018, *Food Chem* 238:35–41). *How to calculate nutrient content of foods: a guideline for food business operators.*
- Link: https://www.eurofir.org/wp-admin/wp-content/uploads/2015/12/EUROFIR-RECIPE-GUIDELINE_FINAL.pdf (14 pages)
- Strength: technical guideline.
- Finding:
  - Gives the step-by-step formula: nutrient per 100 g = Σ(content per 100 g × raw g × RF) / total cooked g.
  - Groups factors into three classes: dry heat (140–350 °C), moist heat (100–125 °C, **including microwave**) and fat/oil (140–200 °C).
  - "Retention factors are not available for all cooking methods and all foods". It recommends using a similar food when a factor is missing.
  - "Results should be always regarded as approximations". Laboratory analysis is preferred for vitamin and mineral claims.
- Design implication: these three heat classes are a sourced way to map methods USDA lacks (such as microwave) onto existing factor rows. The mapping should be shown as a fallback, not as a measured value.
- Caveats: written for labelling, not validated per dish. No air-fryer, sous-vide or pressure-cooker class.

---

## B. Accuracy of calculated recipes compared with chemical analysis

### N12: Grande et al. (2025), *Principles of Nutritional Assessment*, ch. 4a "Food Composition"
- Citation: Grande F, Rittenschober D, Padula de Quadros V, Holmes B (June 2025). In: Gibson RS (ed.), *Principles of Nutritional Assessment*, 3rd ed.
- Link: https://nutritionalassessment.org/chap04/
- Strength: review/chapter.
- Finding:
  - The chapter gives **no numeric agreement ranges**.
  - It says: "differences between calculated and analyzed values for the proximate nutrients were generally small"; "for vitamins and trace minerals, differences may be much larger" (citing Murphy 1991, N13); "differences … exist, especially for micronutrients" (citing Chen 2009, N15, and Vasilopoulou 2003, N14).
- Design implication: the textbook consensus is that macronutrients can be trusted more than micronutrients. The UI should show that difference.
- Caveats: qualitative only.

### N13: Murphy et al. (1991), Kenya mixed dishes
- Citation: Murphy SP, Weinberg-Andersson SW, Neumann C, Mulligan K, Calloway DH (1991). *J Food Compos Anal* 4(1):2–17.
- Link: https://doi.org/10.1016/0889-1575(91)90044-7 (abstract via Europe PMC)
- Strength: study (11 mixed dishes analysed; 247 households for recipe variation). **Abstract only.**
- Finding:
  - Calculated and analysed means agreed **within 10% for most nutrients**. The nutrients covered were energy, protein, fat, carbohydrate and iron only.
  - The energy content of the same dish category varied with recipe proportions, with a CV of **31–111% within households** and 7–100% between households.
- Design implication: the user's actual recipe proportions matter more than the database values. Store the user's own quantities and do not substitute a "standard" recipe.
- Caveats: covers only macros and iron, in one setting.

### N14: Vasilopoulou et al. (2003), traditional Greek recipes
- Citation: Vasilopoulou E, Georga K, Grilli E, Linardou A, Vithoulka M, Trichopoulou A (2003). *J Food Compos Anal* 16(6):707–719.
- Link: https://doi.org/10.1016/s0889-1575(03)00099-1 (abstract via Europe PMC)
- Strength: study. **Abstract only.**
- Finding: "a very good agreement was deduced for the macronutrients and energy content" of composite foods, even though database values for the raw ingredients differed from the ingredients actually analysed.
- Design implication: macro estimates from good ingredient data are usable.
- Caveats: abstract only. No micronutrients. No numbers in the abstract.

### N15: Chen, Gilbert & Khokhar (2009), South Asian dishes
- Citation: Chen A, Gilbert P, Khokhar S (2009). Estimating the nutrient composition of South Asian foods using a recipe calculation method. *Food Chem* 113(3):825–831.
- Link: https://doi.org/10.1016/j.foodchem.2008.05.063 (abstract via Europe PMC; the ScienceDirect page returned 403)
- Strength: study (10 dishes). **Abstract only.**
- Finding:
  - Water loss reached 24%, and fat uptake reached 18.4 g/100 g (puri).
  - "For most nutrients the calculated values exceeded those found by analysis." Differences were smallest for protein, fat and carbohydrate.
  - Fibre, sodium, vitamins C and D, thiamin and riboflavin were "less well estimated".
- Design implication: the engine must apply water loss and fat uptake. Without retention factors, the vitamin values will tend to run high.
- Caveats: abstract only. No per-nutrient percentages.

### N16: Biltoft-Jensen et al. (2017), Danish fast foods
- Citation: Biltoft-Jensen A, Knuthsen P, Saxholt E, Christensen T (2017). *J Food Compos Anal* 64:48–54.
- Link: https://doi.org/10.1016/j.jfca.2017.04.010 (abstract via Europe PMC; ScienceDirect returned 403)
- Strength: study (155 samples). **Abstract only.**
- Finding:
  - Nutrients compared: energy, protein, saturated fat, iron, thiamin, K and Na.
  - With the older database the largest error was saturated fat (28%). With the current FRIDA database it was 11%, and **every nutrient was below 15%** on aggregate.
  - Correlations were 0.49–0.89.
  - For **individual foods**, errors ranged from under 15% to **over 50%**.
- Design implication: averages over many dishes can be within about 15%. A single dish's micronutrient value can be off by half. The per-dish error band has to be shown.
- Caveats: fast food, not home cooking.

### N17: Hong et al. (2021), folate in Korean vegetable dishes
- Citation: Hong J, Jeong BG, Chun J, Lee J, Hyun T (2021). *J Food Compos Anal* 103.
- Link: Europe PMC record AGR IND607458706 (abstract via the Europe PMC REST API; no DOI given in the record)
- Strength: study (56 dishes). **Abstract only.**
- Finding:
  - Analysed folate ranged 3.1–84.8 µg per serving; calculated folate ranged 0.2–164.3 µg.
  - Calculated values were "significantly higher" than analysed, and Bland–Altman agreement was poor.
  - The authors attribute this to weight changes and folate retention not being reflected.
- Design implication: folate is a nutrient where calculation without retention overestimates a lot. Folate needs a retention factor, or it should show as uncertain.
- Caveats: one country's software and database.

### N18: Siebelink et al. (2015), duplicate diets
- Citation: Siebelink E, de Vries JHM, Trijsburg L, Hulshof PJM (2015). *J Food Compos Anal* 43:68–74.
- Link: https://doi.org/10.1016/j.jfca.2015.04.010 (abstract via Europe PMC)
- Strength: study (25 duplicate diets). **Abstract only.**
- Finding:
  - Calculated energy and macros ran higher than analysed, especially carbohydrate.
  - Limits of agreement: protein −11.0 to +11.0 g/day; fat −14.2 to +21.6 g/day; carbohydrate −4.8 to +57.0 g/day; fibre −10.7 to +11.5 g/day.
- Design implication: even macros carry roughly ±10–20 g/day bands at whole-diet level. Show the daily goal comparison as a band.
- Caveats: Dutch database. Macros only.

### N19: Tsai et al. (2018), phosphorus-to-protein ratio of hospital dishes
- Citation: Tsai WC et al. (2018). *Sci Rep* 8:15246.
- Link: https://doi.org/10.1038/s41598-018-33657-8 (abstract via Europe PMC; PMC6189135)
- Strength: study (26 dishes). **Abstract only.**
- Finding: the food composition table overestimated the phosphorus-to-protein ratio for plant dishes (4.1 ± 14.6 mg/g) and meats (2.1 ± 2.3 mg/g), both P = 0.06. Boiling meat lowered phosphorus.
- Design implication: minerals leach on boiling. Retention for boiling (N1, N4) matters for minerals as well as vitamins.
- Caveats: one hospital. Not significant at 0.05.

### N20: Greenfield & Southgate (2003), FAO *Food Composition Data*, ch. 11
- Citation: Greenfield H, Southgate DAT (2003). *Food Composition Data: Production, Management and Use*, 2nd ed. FAO, Rome.
- Link: https://www.fao.org/4/y4705e/y4705e16.htm (title page https://www.fao.org/4/y4705e/y4705e00.htm)
- Strength: review/chapter (FAO reference text).
- Finding:
  - Software built on the same USDA handbook gave "considerable differences" for one day's intake.
  - Applying UK or US tables to Australian foods overestimated meat fat by 60% and total fat by 15–22%. Calcium came out 35% higher with UK data and thiamin 59% higher with US data.
  - The error sources it lists include "differences in conversion of household measures to standard weights", miscoding, and "failure to adjust for water, vitamin and mineral losses".
- Design implication: database choice and unit conversion are error sources as large as the cooking factors. Pin one database version and record it on every computed value.
- Caveats: older comparisons.

### N21: Cushen, O'Grady & Geaney (2026), recipe software comparison
- Citation: Cushen SJ, O'Grady A, Geaney F (2026). Comparing recipe nutrient calculations across nutrition analysis software for workplace menu planning. *Nutrition & Food Science* 56(3):612–624. doi:10.1108/NFS-08-2025-0268.
- Link: https://www.emerald.com/nfs/article/56/3/612/1344359/Comparing-recipe-nutrient-calculations-across
- Strength: study (12 recipes × 3 programs). **Abstract only.**
- Finding:
  - Energy averaged about 23 kcal higher than Nutritics (range −3.2 to 101).
  - Salt was 36.4% lower than MyFood24.
  - Vitamin A differed by −145 µg (p = 0.05) and vitamin D by −0.37 µg (p < 0.001).
- Design implication: the same recipe gives different micronutrient totals in different tools. Do not promise agreement with other apps.
- Caveats: software against software, not against analysis.

### N22: European Commission (2012), label tolerance guidance
- Citation: European Commission DG SANCO (Dec 2012). *Guidance document … with regard to the setting of tolerances for nutrient values declared on a label.*
- Link: https://www.FSAI.ie/getmedia/71c87819-77a7-4bf2-b741-2f11cf019c2d/EU-guidance-tolerances.pdf (final; a draft copy at https://assets.publishing.service.gov.uk/media/5a7cc3eced915d63cc65cb79/EU-Guidance-on-Tolerance.pdf also opened)
- Strength: regulatory guidance (no formal legal status).
- Finding: tolerances for foods (including measurement uncertainty):

  | Nutrient | Amount per 100 g | Tolerance |
  |---|---|---|
  | Vitamins | any | +50% / −35% |
  | Minerals | any | +45% / −35% |
  | Carbohydrate, sugars, protein, fibre | < 10 g | ±2 g |
  | | 10–40 g | ±20% |
  | | > 40 g | ±8 g |
  | Fat | < 10 g | ±1.5 g |
  | | 10–40 g | ±20% |
  | | > 40 g | ±8 g |
  | Sodium | < 0.5 g | ±0.15 g |
  | | ≥ 0.5 g | ±20% |

- Design implication: regulators accept −35%/+50% for vitamins on a product label. That is a defensible "reasonable band" to show around calculated micronutrients.
- Caveats: these are compliance tolerances, not a measured error of calculation.

### N23: Derived measurement: two official retention tables disagree, and one cooked-carrot cross-check
- Citation: this report, computed from N1 (CSV codes 3004, 3005, 3015, 3454, 3455) and N4 (Table 30); carrot values from SR Legacy (N27, FDC IDs 170393 and 170394).
- Link: the N1 CSV (https://ndownloader.figshare.com/files/44488754), N4 (https://publikationen.bibliothek.kit.edu/9642002/1928), and https://api.nal.usda.gov/fdc/v1/food/170394 (called with DEMO_KEY)
- Strength: derived measurement.
- Finding:
  - Boiled leafy greens, drained, in USDA vs Bognár (vegetable portion "A"):

    | Nutrient | USDA | Bognár | Gap |
    |---|---|---|---|
    | Vitamin C | 55–60% | 40% | 15–20 points |
    | Folate | 60–65% | 50% | 10–15 points |
    | Potassium | 85–90% | 50% | 35–40 points |

  - SR Legacy carrots, raw vs boiled and drained:

    | Nutrient | Raw (per 100 g) | Boiled (per 100 g) |
    |---|---|---|
    | Water | 88.3 g | 90.2 g |
    | Vitamin C | 5.9 mg | 3.6 mg (analytical, n = 4) |
    | Folate | 19 µg | 14 µg |

  - On a dry-weight basis the carrot figures imply apparent retention of 73% for vitamin C and 88% for folate. USDA's boiled-roots factor is 65–70% for both.
- Design implication: a retention factor is roughly ±15–40 percentage points for a specific food. Store the factor source with each applied factor, and prefer a directly analysed cooked entry when one exists.
- Caveats: the carrot check is one food, with raw and cooked samples from different studies. Apparent retention assumes no loss of solids.

---

## C. FoodData Central today

### N24: FDC API guide
- Citation: USDA ARS (accessed 2026-10-28). *FoodData Central API Guide.*
- Link: https://fdc.nal.usda.gov/api-guide/ plus live calls to https://api.nal.usda.gov/fdc/v1/food/170394 and https://api.nal.usda.gov/fdc/v1/foods/search
- Strength: official documentation, plus an observed call.
- Finding:
  - The default limit is "1,000 requests per hour per IP address". Going over blocks the key for 1 hour and returns HTTP 429. The guide says DEMO_KEY allows 30 per hour and 50 per day.
  - On 2026-10-28 the DEMO_KEY responses carried `x-ratelimit-limit: 10`.
  - Data are "in the public domain", CC0 1.0.
  - Endpoints: `/food/{fdcId}`, `/foods`, `/foods/list`, `/foods/search`. The `dataType` filter covers Foundation, SR Legacy, Survey (FNDDS), Branded and Experimental.
  - A search for "carrots cooked boiled" returns SR Legacy entries such as 170394 "Carrots, cooked, boiled, drained, without salt". Its `foodPortions` are 1 carrot = 46 g, 1 tbsp = 9.7 g and ½ cup slices = 78 g.
- Design implication: for 15–500 ingredients, bulk download (N25) beats the API. Use the personal key, not DEMO_KEY.
- Caveats: the observed DEMO_KEY limit does not match the documented one.

### N25: FDC download page
- Citation: USDA ARS (accessed 2026-10-28). *FoodData Central: Download Data.*
- Link: https://fdc.nal.usda.gov/download-datasets/
- Strength: official dataset listing.
- Finding:

  | Release | Date | Size (JSON or CSV) |
  |---|---|---|
  | Foundation Foods | 10/2026 | JSON 681 K zipped / 9 M; CSV 35 M |
  | SR Legacy | 04/2018 (final) | JSON 205 M; CSV 54 M |
  | FNDDS 2021–2023 | 10/2024 | — |
  | Branded | 10/2026 | about 3 G |

  - SR Legacy: "the final release … will not be updated." FNDDS is updated every two years. Foundation and Branded appear roughly twice a year (April and October).
- Design implication: SR Legacy is a frozen, stable snapshot to pin. Foundation changes twice a year, so record the release date on every imported value.
- Caveats: none significant.

### N26: FDC data type definitions
- Citation: USDA ARS (accessed 2026-10-28). *FoodData Central: Data Documentation.*
- Link: https://fdc.nal.usda.gov/data-documentation/
- Strength: official documentation.
- Finding:
  - Foundation Foods: "commodity/commodity-derived minimally processed foods … based on analytically derived values", with sample-level metadata.
  - SR Legacy: "nutrients derived from analyses, calculations, and published literature", final release April 2018.
  - FNDDS: nutrients and portion weights for foods reported in WWEIA/NHANES.
  - Branded: label data, updated monthly.
- Design implication: Foundation means measured but sparse. SR Legacy means complete but mixed provenance. The provenance should be carried per value.
- Caveats: the page itself says nothing about cooked foods or portions.

### N27: Derived measurement: micronutrient coverage, cooked entries and portions in Foundation vs SR Legacy
- Citation: this report, from `FoodData_Central_foundation_food_json_2026-10-29.json` and `FoodData_Central_sr_legacy_food_json_2018-04.json` (script `fdc_cov.py`).
- Link:
  - https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-10-29.zip
  - https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
  - https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
- Strength: derived measurement.
- Finding: share of foods with a value present.

  | Nutrient | Foundation (424 foods) | SR Legacy (7,793 foods) |
  |---|---|---|
  | Vitamin C | 27.8% | 94.1% |
  | Vitamin A (RAE) | 12.3% | 88.8% |
  | Vitamin D | 18.4% | 66.5% |
  | Vitamin E | 20.3% | 71.6% |
  | Vitamin K | 20.0% | 64.9% |
  | Thiamin | 50.5% | 95.0% |
  | Total folate | 40.6% | 87.9% |
  | B12 | 17.9% | 91.3% |
  | Choline | 9.2% | 59.2% |
  | Selenium | 36.1% | 88.1% |
  | Iodine | 11.1% | 0% |
  | Ca, Fe, Mg, P, K, Zn, Cu, Mn | 93.4% | — |
  | Ca, Fe, Mg, K, Zn | — | 95–99% |

  Cooked entries:
  - SR Legacy: 2,153 of 7,793 descriptions (27.6%) contain a cooking word. Of the vitamin values in those cooked entries, 16.1% are "Analytical", 8.9% "assumed zero" and 39.1% have no derivation code.
  - Foundation: 17 of 424 (4.0%) contain a cooking word, such as kale frozen boiled, braised chicken and roasted beef. Foundation has no "carrots, cooked".

  Portions:
  - SR Legacy: 96.7% of foods have at least one portion, 14,449 in total. The commonest units are oz (3,190), cup (2,258) and tbsp (573). In the CSV, 24.5% of portions record data points; the JSON drops that field.
  - Foundation: 68.6% of foods have portions, but 271 of its 394 portions are "RACC" (reference amount customarily consumed), not household measures.
- Design implication:
  - For a full micronutrient table, SR Legacy (or FNDDS) has to be the backbone. Foundation alone leaves most vitamin cells empty.
  - Where SR Legacy has an analysed cooked entry (for example boiled carrots), use it directly instead of raw × retention factor.
- Caveats: SR Legacy's higher coverage includes imputed, calculated and assumed-zero values. Foundation reports only nutrients it analysed, and some vitamins are irrelevant to some foods (for example vitamin C in meat).

### N28: SR Legacy documentation (household weights)
- Citation: USDA ARS NDL (2018). *USDA National Nutrient Database for Standard Reference, Legacy Release: Documentation.*
- Link: https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR-Legacy/SR-Legacy_Doc.pdf
- Strength: official documentation.
- Finding:
  - The Weight file holds 14,449 records of "weights in grams of several common measures". Its fields are amount, measure description (for example "cup, diced"), gram weight, number of data points and standard deviation.
  - Totals: 7,793 foods and 644,125 nutrient records.
- Design implication: household measure to grams is a sourced lookup per food and measure (for example "1 medium" carrot = 61 g, "1 cup chopped" = 128 g). There is no need to invent densities.
- Caveats: a measure is available only if USDA listed it for that exact food. Most portions carry no data-point count.

---

## D. Intake goals (Dietary Reference Intakes)

### N29: NASEM (2019), DRI summary tables (Appendix J)
- Citation: National Academies of Sciences, Engineering, and Medicine (2019). *Dietary Reference Intakes for Sodium and Potassium*, Appendix J: Dietary Reference Intakes Summary Tables. National Academies Press.
- Link: https://www.nationalacademies.org/read/25353/chapter/28 (NCBI Bookshelf NBK545442 returned a browser challenge)
- Strength: official reference values (primary US source).
- Finding:
  - Nine tables: EAR; RDA/AI for vitamins; RDA/AI for elements; RDA/AI for water and macronutrients; AMDR; additional macronutrient recommendations; Chronic Disease Risk Reduction Intakes; UL for vitamins; UL for elements.
  - Footer: "© 2026 National Academy of Sciences. All Rights Reserved." A free PDF is offered.
  - **No official CSV or JSON was found.**
- Design implication: transcribe the values, with a citation per value. For one user that is about 35 values from a single life-stage row.
- Caveats:
  - Reuse terms for redistributing the numbers were not verified.
  - Personal calorie and protein targets are owned by MacroFactor per the context pack, so only micronutrient reference values belong here.

### N30: Health Canada DRI tables (HTML)
- Citation: Health Canada (page dated 2025-11-19). *Dietary reference intakes tables*: vitamins, elements, macronutrients.
- Link:
  - https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables.html
  - https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-vitamins.html
  - https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-elements.html
  - Terms: https://www.canada.ca/en/transparency/terms.html
- Strength: official reference values (same IOM/NASEM source) in HTML tables.
- Finding:
  - Columns are EAR, RDA/AI and UL by life stage.
  - Values shown include vitamin C for males 19–30: EAR 75, RDA 90, UL 2,000 mg. Iron: males 19–30 EAR 6, RDA 8, UL 45 mg; females 19–30 EAR 8.1, RDA 18, UL 45 mg.
  - Key footnotes:
    - Several ULs cover only certain sources: synthetic folic acid, synthetic niacin and synthetic vitamin E; for magnesium, "a pharmacological agent only"; for vitamin A, preformed vitamin A.
    - No UL was set for vitamin K, thiamin, riboflavin, B12, pantothenic acid or biotin.
    - The iron requirement "is 1.8 times higher for vegetarians". Zinc "may be as much as 50 percent greater for vegetarians".
  - Terms: non-commercial reproduction is allowed with attribution. Commercial redistribution needs permission.
- Design implication:
  - HTML tables are the easiest source to scrape for transcription.
  - Mark each UL with the form it applies to, so food-only intake is not flagged against a supplement-only UL.
  - Diet type (vegetarian) changes the iron and zinc goals. This is the sourced way to handle bioavailability in goals.
- Caveats: these are Canadian pages. Whether they reflect all 2019 and 2023 updates was not checked.

### N31: USDA NAL DRI Calculator
- Citation: USDA National Agricultural Library (accessed 2026-10-28). *DRI Calculator for Healthcare Professionals.*
- Link: https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator
- Strength: official tool.
- Finding: takes sex, age, pregnancy or lactation, height, weight and activity, and outputs BMI, energy, macros, vitamins and minerals from the NASEM DRIs. The page mentions **no export, API or dataset**.
- Design implication: useful for spot-checking transcribed values, not as a data feed.
- Caveats: none.

---

## E. Bioavailability and absorption modifiers

### N32: Hallberg & Hulthén (2000), iron absorption algorithm
- Citation: Hallberg L, Hulthén L (2000). Prediction of dietary iron absorption: an algorithm for calculating absorption and bioavailability of dietary iron. *Am J Clin Nutr* 71(5):1147–1160.
- Link: https://doi.org/10.1093/ajcn/71.5.1147 (abstract via Europe PMC; PMID 10799377)
- Strength: study and model. **Abstract only.**
- Finding:
  - The algorithm starts from basal absorption from a wheat roll (22.1%), adjusted to a 40% reference dose. It then multiplies by dose-effect equations for phytate, polyphenols, ascorbic acid, meat/fish, calcium, egg, soy, alcohol and heme iron.
  - Against 24 measured meals, r² = 0.987. Against a 5-day whole diet in 31 subjects, P = 0.958.
- Design implication: this is the one **quantitative, published** multi-factor modifier model for iron. The equations are in the full text, which was not read here.
- Caveats: the equations must be taken from the paper itself. The model needs phytate and polyphenol amounts, which FDC lacks (see N38).

### N33: Hallberg, Brune & Rossander (1989), phytate dose response and ascorbic acid
- Citation: *Am J Clin Nutr* 49(1):140–144.
- Link: https://doi.org/10.1093/ajcn/49.1.140 (abstract via Europe PMC)
- Strength: study (isotope; N not stated in the abstract). **Abstract only.**
- Finding:
  - Phytate (as phytate phosphorus) cut iron absorption by 18% at 2 mg, 64% at 25 mg and 82% at 250 mg.
  - Ascorbic acid "significantly counteracted" the inhibition. The effect of meat was "less well defined".
- Design implication: phytate's effect on iron has numbers; ascorbic acid's counter-effect is directional in the abstract.
- Caveats: single test meals (wheat rolls).

### N34: Cook & Reddy (2001), vitamin C and iron over a complete diet
- Citation: *Am J Clin Nutr* 73(1):93–98.
- Link: https://doi.org/10.1093/ajcn/73.1.93 (abstract via Europe PMC)
- Strength: study (N = 12). **Abstract only.**
- Finding: with dietary vitamin C at 51–247 mg/day there was no significant difference in nonheme iron absorption. "The facilitating effect of vitamin C … from a complete diet is far less pronounced than that from single meals."
- Design implication: a per-meal "vitamin C boosts iron by X%" rule would overstate the effect on daily totals. If used at all, label it per meal and directional.
- Caveats: small N.

### N35: Hurrell & Egli (2010), iron bioavailability and dietary reference values
- Citation: *Am J Clin Nutr* 91(5):1461S–1467S.
- Link: https://doi.org/10.3945/ajcn.2010.28674f (abstract via Europe PMC)
- Strength: review. **Abstract only.**
- Finding:
  - Iron bioavailability is estimated at 14–18% for mixed diets and 5–12% for vegetarian diets, and these figures were used to set reference values.
  - Single-meal effects of enhancers and inhibitors shrink in multi-meal studies.
  - The person's iron status "generally has a greater effect than diet composition".
- Design implication: the DRIs already assume a typical bioavailability. Applying absorption modifiers to intake and then comparing with the RDA risks **double-counting**.
- Caveats: none significant.

### N36: Miller, Krebs & Hambidge (2007), zinc absorption model
- Citation: *J Nutr* 137(1):135–141.
- Link: https://doi.org/10.1093/jn/137.1.135 (abstract via Europe PMC; PMC1995555)
- Strength: model fitted to 21 mean data points. **Abstract only.**
- Finding: zinc absorption is modelled as a function of total dietary zinc and phytate, with R² = 0.82 and parameters A_MAX 0.13, K_R 0.10 and K_P 1.2 mmol/day. "Several of these estimates had wide CI."
- Design implication: a sourced, quantitative zinc and phytate model exists, at whole-day level.
- Caveats: wide confidence intervals. Needs phytate intake.

### N37: EFSA (2014), dietary reference values for zinc, adjusted for phytate
- Citation: EFSA NDA Panel (2014). Scientific Opinion on Dietary Reference Values for zinc. *EFSA J* 12(10):3844.
- Link: https://doi.org/10.2903/j.efsa.2014.3844 (abstract via Europe PMC; PMC13136992)
- Strength: official scientific opinion. **Abstract only.**
- Finding: PRIs are given at phytate intakes of 300, 600, 900 and 1,200 mg/day: men 9.4–16.3 mg/day and women 7.5–12.7 mg/day (ARs: men 7.5–12.7, women 6.2–10.2).
- Design implication: rather than an "absorption modifier", pick the zinc **goal** that matches estimated phytate intake. An official body has done this.
- Caveats: these are EU values, not US DRIs. Phytate intake must be estimated.

### N38: Dahdouh et al. (2019), FAO/INFOODS/IZiNCG phytate database (PhyFoodComp 1.0)
- Citation: *J Food Compos Anal* 78:42–48.
- Link: https://doi.org/10.1016/j.jfca.2019.01.023 (abstract via Europe PMC; PMC6472536), plus https://izincg.org/faoinfoodsizincg-global-food-composition-database-for-phytate
- Strength: official database paper. **Abstract only.**
- Finding:
  - 3,377 entries from more than 250 references, 39% raw and 61% processed (cereals 35%, legumes 27%), with phytate:mineral molar ratios.
  - Measured in N27's files: **FDC contains no phytate values.** Oxalic acid appears for only 13 Foundation foods.
- Design implication: iron and zinc modifiers need a second source (PhyFoodComp) mapped to FDC foods. That is extra matching work.
- Caveats: licence and file format not verified (FAO page returned 403). Analytical methods vary.

### N39: Brown et al. (2004), salad dressing fat and carotenoid absorption
- Citation: *Am J Clin Nutr* 80(2):396–403.
- Link: https://doi.org/10.1093/ajcn/80.2.396 (abstract via Europe PMC)
- Strength: study (N = 7). **Abstract only.**
- Finding: salads with 0, 6 or 28 g canola oil. With fat-free dressing, α-carotene, β-carotene and lycopene appearance was "negligible". It was higher at 6 g, and higher still at 28 g.
- Design implication: the direction is clear (no fat means near-zero absorption). There is no single multiplier.
- Caveats: N = 7.

### N40: Goltz et al. (2012), amount and type of fat with carotenoids
- Citation: *Mol Nutr Food Res* 56(6):866–877.
- Link: https://doi.org/10.1002/mnfr.201100687 (abstract via Europe PMC)
- Strength: study (N = 29). **Abstract only.**
- Finding: 20 g of lipid gave higher carotenoid absorption than 3 g or 8 g (p < 0.05; α-carotene p = 0.07). Fat source (canola, soybean, butter) mattered less than amount.
- Design implication: supports a sourced threshold-style flag ("eaten with ≥ X g fat") rather than a percentage.
- Caveats: the study measured absorption into triglyceride-rich lipoproteins, not body status.

### N41: Roodenburg et al. (2000), 3 g vs 36 g fat
- Citation: *Am J Clin Nutr* 71(5):1187–1193.
- Link: https://doi.org/10.1093/ajcn/71.5.1187 (abstract via Europe PMC)
- Strength: study (4 groups of 14–15). **Abstract only.**
- Finding: 3 g vs 36 g of fat did not change plasma rises of vitamin E or α- and β-carotene taken as supplements. Lutein esters rose 207% with high fat vs 88% with low fat.
- Design implication: N39–N41 do not agree on the fat threshold. Any fat × carotenoid rule is **directional, with a study-specific threshold**.
- Caveats: supplements, not food matrices.

### N42: Gärtner, Stahl & Sies (1997), lycopene from tomato paste vs fresh tomato
- Citation: *Am J Clin Nutr* 66(1):116–122.
- Link: https://doi.org/10.1093/ajcn/66.1.116 (abstract via Europe PMC)
- Strength: study (N not stated in the abstract). **Abstract only.**
- Finding: 23 mg lycopene with 15 g corn oil. Paste gave 2.5-fold higher peak and **3.8-fold higher AUC** for lycopene than fresh tomato. There was no difference for α- and β-carotene.
- Design implication: a sourced ratio exists for one comparison (processed vs fresh). It is not a general "cooking × lycopene" factor.
- Caveats: single dose. Paste is processed, not home cooking.

### N43: Dewanto et al. (2002), heating tomatoes
- Citation: *J Agric Food Chem* 50(10):3010–3014.
- Link: https://doi.org/10.1021/jf0115589 (abstract via Europe PMC)
- Strength: study (in vitro chemistry). **Abstract only.**
- Finding:
  - Heating at 88 °C for 2, 15 and 30 minutes.
  - Vitamin C went from 0.76 to 0.68, 0.64 and 0.54 µmol/g, which is −11%, −16% and −29% (computed).
  - Trans-lycopene went from 2.01 to 3.11, 5.45 and 5.32 (as published, "mg/g"), which is +55%, +171% and +165% (computed).
- Design implication: one cooking step can lower one nutrient and raise the extractable amount of another. The engine needs per-nutrient direction, which N1 (cap at 100%) cannot express.
- Caveats: this measures extractable content, not human absorption. The units as printed in the abstract look implausible.

### N44: Heaney, Weaver & Recker (1988), calcium from spinach
- Citation: *Am J Clin Nutr* 47(4):707–709.
- Link: https://doi.org/10.1093/ajcn/47.4.707 (abstract via Europe PMC)
- Strength: study (N = 13, crossover, isotope). **Abstract only.**
- Finding: fractional calcium absorption was 27.6% from milk and 5.1% from spinach, at 200 mg calcium each.
- Design implication: a sourced food-specific absorption contrast that a "calcium from spinach" caution can cite.
- Caveats: applies to high-oxalate foods. Spinach calcium was fully bound in this sample.

---

## F. Ingredient matching and household measures

### N45: Kalra et al. (2020), recipe nutrition estimation by mapping to USDA SR
- Citation: Kalra J, Batra D, Diwan N, Bagler G (2020). Nutritional Profile Estimation in Cooking Recipes. ICDE 2020 DECOR workshop; arXiv:2004.12286.
- Link: https://arxiv.org/html/2004.12286v1 and https://arxiv.org/abs/2004.12286
- Strength: workshop paper (non-peer-reviewed preprint).
- Finding:
  - Heuristic matching mapped 94.49% of unique ingredients to USDA entries. A manual check of the top 5,000 ingredient-and-state pairs judged 3,580 (**71.6%**) correct.
  - "The main problem lies in matching the units of ingredients to appropriate units in the USDA dataset."
  - Mean error was 36.42 kcal per serving over 2,482 recipes, against AllRecipes' third-party values, not chemical analysis.
- Design implication: automatic free-text matching is wrong about 1 time in 4. Foodi Dex should have the user confirm each ingredient → FDC food and measure → grams once, then store it.
- Caveats: the "ground truth" is another calculator.

### N46: Gibson et al. (2016), accuracy of household measures in portion estimation
- Citation: Gibson AA et al. (2016). Accuracy of hands v. household measures as portion size estimation aids. *J Nutr Sci* 5:e29.
- Link: https://doi.org/10.1017/jns.2016.22 (abstract via Europe PMC; PMC4976119)
- Strength: study (N = 67, 42 foods). **Abstract only.**
- Finding: estimates made with household measures (cups and spoons) were within ±25% of true weight 29% of the time, and within ±10% 8% of the time.
- Design implication: volume entries ("1 cup chopped") carry large error. Offer gram entry first, and show household-measure conversions as approximate.
- Caveats: this tests people estimating portions they see, not measuring with cups while cooking.

---

## What exists vs what would have to be invented

| Capability | Data exists? | Source IDs |
|---|---|---|
| Raw nutrient amounts per 100 g, full micronutrient panel | Yes. SR Legacy covers 88–99% for most vitamins and minerals. Foundation is sparse (vitamin C 28%, A 12%, B12 18%). | N25, N26, N27 |
| Directly analysed cooked foods | Partly. 2,153 SR Legacy entries describe a cooked state, but only some values are analytical. Foundation has 17. | N27, N24 |
| Vitamin and mineral retention by food group × method | Yes, machine-readable, CC0: 270 codes × 26 components | N1 |
| Retention for protein, fat, carbs, fibre, vitamins D/E/K, Se, Mn, iodine, pantothenic acid | Not in USDA. Bognár gives values, but many are marked "estimated" or are a 1.0 placeholder. | N1, N4 |
| Water and fat change (yield) for meat and poultry | Yes, CSV, 173 rows | N3 |
| Yield for vegetables, grains, legumes, eggs and mixed dishes | Exists only as a scanned PDF (AH-102, about 2,894 items) or PDF tables (Bognár, about 700 items). Needs transcription. FNDDS MoistAdjust covers per-dish moisture. | N2, N4, N5 |
| Fat uptake in frying | Partly (Bognár, per category) | N4, N15 |
| Microwave, air-fryer, pressure cooker, sous-vide factors | Microwave only through EuroFIR's "moist heat" grouping. The others: none found. | N1, N11 |
| Recipe calculation algorithm | Yes, settled: yield at recipe level, retention at ingredient level | N5, N6, N7, N8, N11 |
| Household measure → grams | Yes per food (SR Legacy 14,449 portions; FNDDS about 22,000). Foundation is mostly RACC only. | N27, N28, N5 |
| Free-text ingredient → FDC food | No dataset. Heuristic matching was about 72% correct. | N45 |
| DRI goals (RDA/AI/UL) by life stage | Yes, as published tables (PDF and HTML). No official CSV or JSON found. Must be transcribed. | N29, N30, N31 |
| Absorption modifiers with numbers | Iron (algorithm) and zinc (phytate model, phytate-specific EFSA PRIs): yes. Fat × carotenoids: direction plus inconsistent thresholds. Lycopene × processing: one ratio. Vitamin C × iron over whole diets: weak. | N32–N37, N39–N43 |
| Phytate content of foods (needed for iron and zinc models) | Not in FDC. Separate database (PhyFoodComp), needs mapping. | N38 |
| Expected error of a calculated dish | Macros: about 10–15% on average. Micronutrients: worse, over 50% for individual dishes. Label tolerance is −35%/+50%. | N13–N22 |

## Gaps

- **No vitamin-by-vitamin meta-analysis** of calculated vs analysed values was found. The accuracy evidence is single studies, mostly read as abstracts (N13–N19). Per-nutrient error percentages for vitamins were not available in the abstracts I read.
- **Unopened or blocked:**
  - The Nordic validation report (Öhrvik et al. 2015, TemaNord 2015:568, doi:10.6027/TN2015-568): both the OAPEN and norden.org PDFs returned 403. It reportedly validates calculated against analysed values, so it is worth reading.
  - Machackova et al. 2018 (abstract only; compliance data not seen).
  - The NIH ODS DRI page returned 403.
  - The NCBI Bookshelf DRI pages returned a browser challenge.
  - The Ag Data Commons and HathiTrust records returned 403. Mirrors were used.
- **Licences not verified:**
  - Bognár (2002).
  - PhyFoodComp.
  - Reuse of the NASEM DRI tables beyond personal use.
  - AH-102's public-domain status, inferred as a US federal work.
- **Not verified:** the RAE and DFE conversion ratios that the DRIs and FDC use (they are the DRIs' built-in bioavailability adjustments). The Health Canada page points to a separate conversion-factors section that was not opened.
- **No factors found** for air-frying, pressure cooking or sous-vide. No USDA code for microwaving.
- **No study found** that measures household-measure → gram conversion error in recipe calculation separately from the error in matching ingredients to foods.
- **Full text of the Hallberg & Hulthén (2000) equations was not read.** An iron engine would need them transcribed from the paper.
- **Observed vs documented FDC DEMO_KEY limit** (10 vs 30 per hour): unexplained.
- The USDA retention table's factors trace back to a 1982 provisional table and were last changed in 2007 (choline). The age of the underlying studies per factor is not given.
