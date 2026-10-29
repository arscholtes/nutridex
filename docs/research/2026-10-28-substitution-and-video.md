# R2: Flavour-preserving substitution, nutrient-goal suggestions, recipe explainer video

Evidence base for the Foodi Dex debate. Compiled 2026-10-28. I opened every source listed here on that date. Each "Link" is the URL I actually read.

Labels used:
- **abstract only**: only the abstract or a summary page was readable, so numbers from the body are not available.
- **unverified**: I could not confirm the item on a primary page. The reason is given.
- **Strength** classes: peer-reviewed; preprint (arXiv/medRxiv, not peer-reviewed); official docs; official pricing page (with its date, or "no date shown; accessed 2026-10-28"); government report; standard (W3C); vendor marketing; news.
- Derived numbers (for example $/s computed from $/token) are marked **computed** and show the arithmetic.

---

## 1. Flavour-preserving substitution

### V1 — Flavour network and food pairing (Ahn et al.)
- Citation: Ahn Y-Y, Ahnert SE, Bagrow JP, Barabási A-L (2011). Flavor network and the principles of food pairing. *Scientific Reports* 1:196.
- Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC3240947/
- Strength: peer-reviewed (full text read).
- Finding: Built from 56,498 recipes, 381 ingredients and 1,021 flavour compounds, with 51 compounds per ingredient on average. North American recipes use compound-sharing ingredient pairs more than chance predicts, and East Asian recipes use them less. A few ingredients drive the effect: it falls below significance (z < 2) after removing 13 North American ingredients, which appear in 74.4% of that cuisine's recipes, or 5 East Asian ones.
- Design implication: Compound overlap describes some cuisines and not others, so it cannot be a universal "keeps the flavour" score in Foodi Dex.
- Caveats: Compound concentrations and detection thresholds were left out because the data did not exist. The authors call the compound databases incomplete and possibly biased.

### V2 — FlavorDB paper (Garg et al.)
- Citation: Garg N, Sethupathy A, Tuwani R, … Bagler G (2018). FlavorDB: a database of flavor molecules. *Nucleic Acids Research* 46(D1):D1210–D1216.
- Link: https://academic.oup.com/nar/article/46/D1/D1210/4559748
- Strength: peer-reviewed (full text read).
- Finding: 25,595 flavour molecules, of which 2,254 are linked to 936 natural ingredients. The article itself is open access under CC BY-NC 4.0.
- Design implication: About 936 ingredients have compound data. Many of Foodi Dex's ingredients will have no FlavorDB match.
- Caveats: The paper gives no separate licence for the database. See V3.

### V3 — FlavorDB website licence and availability
- Citation: CoSyLab, IIIT-Delhi (accessed 2026-10-28). FlavorDB homepage.
- Link: https://cosylab.iiitd.edu.in/flavordb/
- Strength: official docs (no date shown).
- Finding: The site says the work is "licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License." No bulk download and no API are listed. Counts match V2: 25,595 molecules, and 2,254 of them linked to 936 ingredients in 34 categories.
- Design implication: Use is fine for a personal, non-commercial app with attribution, and any derived compound data must be shared under the same terms. Any commercial turn needs permission. There is no API, so ingestion would mean scraping, which the licence does not address.
- Caveats: Two licences conflict: the site says CC BY-NC-SA 3.0 and the paper says CC BY-NC 4.0. Treat NonCommercial plus ShareAlike as the binding terms.

### V4 — The food-pairing hypothesis called "discredited" (Spence)
- Citation: Spence C (2020). Food and beverage flavour pairing: A critical review of the literature. *Food Research International* 133:109124.
- Link: https://pubmed.ncbi.nlm.nih.gov/32466920/
- Strength: peer-reviewed review, **abstract only**.
- Finding: The abstract calls the food-pairing hypothesis "now-discredited." It describes shared-molecule (physicochemical) pairing as "an ultimately unsuccessful attempt to predict matches based on perceived similarity," and separates cognitive/cultural pairing principles from perceptual ones.
- Design implication: Do not present "shares N flavour compounds" to users as evidence that a swap will taste the same.
- Caveats: The review is about pairing, not substitution. I could not read the evidence tally in the body.

### V5 — Negative food pairing in Indian regional cuisines (Jain, Rakhi, Bagler)
- Citation: Jain A, Rakhi NK, Bagler G (2015). Analysis of food pairing in regional cuisines of India. arXiv:1505.00890. The arXiv page lists DOI 10.1371/journal.pone.0139539, so it was published in PLoS ONE.
- Link: https://arxiv.org/abs/1505.00890
- Strength: peer-reviewed (via the PLoS ONE DOI), **abstract only**.
- Finding: All eight Indian regional cuisines show negative food pairing: ingredients that share more compounds appear together less often. Spices push the pattern negative and dairy pushes it positive.
- Design implication: A compound-overlap score would mis-rank swaps for spice-led dishes.
- Caveats: Recipe counts are not shown in the abstract.

### V6 — Flavour-based vs co-occurrence recommenders (Palermo et al.)
- Citation: Palermo G, Caprioli C, Albora G (2024). Food Pairing Unveiled: Exploring Recipe Creation Dynamics through Recommender Systems. arXiv:2406.15533.
- Link: https://arxiv.org/abs/2406.15533
- Strength: preprint, **abstract only**.
- Finding: "The recipe-based recommender performs significantly better than the flavor-based one." Food pairing in the data is "mostly due to trivial couplings of very similar ingredients."
- Design implication: Recipe co-occurrence is a stronger signal than shared compounds for ingredient recommendation.
- Caveats: This is a pairing task, not substitution. The abstract gives no numbers.

### V7 — Substitute network mined from user reviews (Teng, Lin, Adamic)
- Citation: Teng C-Y, Lin Y-R, Adamic LA (2012). Recipe recommendation using ingredient networks. Proc. 4th ACM Web Science Conference (WebSci'12). arXiv:1111.3919.
- Link: https://ar5iv.labs.arxiv.org/html/1111.3919 (venue from https://arxiv.org/abs/1111.3919)
- Strength: peer-reviewed conference paper (full text read).
- Finding: Built from 46,337 Allrecipes recipes and 1,976,920 reviews. Substitutions were mined from phrases such as "replace a with b," keeping only those seen at least 5 times (for example, 68% of white-sugar substitutions were Splenda). The substitute network breaks into communities of functionally equivalent ingredients and shows a preference for healthier variants. On pairwise rating prediction, ingredient-network features plus nutrition scored 0.792 against a 0.712 baseline.
- Design implication: Substitutions that real cooks reported, filtered by frequency, are a cheap and explainable seed table.
- Caveats: The paper does not test flavour compounds. The data is US-centric, from 2011–2012.

### V8 — Food2Vec and FoodBERT embeddings for substitution (Pellegrini et al.)
- Citation: Pellegrini C, Özsoy E, Wintergerst M, Groh G (2021). Exploiting Food Embeddings for Ingredient Substitution. HEALTHINF 2021, pp. 67–77.
- Link: https://www.scitepress.org/Papers/2021/102020/102020.pdf
- Strength: peer-reviewed conference paper (full PDF read).
- Finding: Against a ground truth of 42 ingredients and 708 pairs, precision at about 3 suggestions per ingredient was 0.847 for multimodal FoodBERT and 0.762 for text Food2Vec. Recall was low, at 0.12–0.16. In human evaluation (200 pairs per method, 2 raters, Cohen's κ 0.72), precision was 0.80 on common ingredients (multimodal FoodBERT) but only 0.51–0.80 depending on method. Sampled across all ingredients it fell to 0.53–0.73, with rare ingredients doing worse.
- Design implication: Even the best embedding gets about 1 in 5 suggestions wrong for common ingredients and worse for rare ones. Suggestions need a filter or a human check before a user sees them.
- Caveats: The method is context-free, so it ignores what the ingredient does in a given dish. The ground truth was extended with the models' own correct predictions, so recall is an upper bound.

### V9 — Knowledge-graph substitution with a nutrition filter (Shirai et al.)
- Citation: Shirai SS, Seneviratne O, Gordon ME, Chen C-H, McGuinness DL (2021). Identifying Ingredient Substitutions Using a Knowledge Graph of Food. *Frontiers in Artificial Intelligence* 3:621766.
- Link: https://frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2020.621766/full
- Strength: peer-reviewed (full text read).
- Finding: DIISH combines co-occurrence, recipe-context PPMI and Word2Vec/spaCy embeddings (Word2Vec trained on Recipe1M), then filters candidates using FoodKG, FoodOn and USDA nutrition data. MRR was 0.482 and RR@10 0.764 on curated data, falling to MRR 0.373 on Food.com review data. Nutrition computed from recipe text was off by 34.51 kcal per serving on average across 8,659 recipes.
- Design implication: "Candidate generator + explicit nutrient filter" is a published, workable pattern. Expect parsing error in per-serving nutrients even with a database.
- Caveats: There was no human or taste study. Only one-to-one swaps were tested. Several failures came from FoodOn mapping errors.

### V10 — GISMo and the Recipe1MSubs benchmark (Fatemi et al.)
- Citation: Fatemi B, Duval Q, Girdhar R, Drozdzal M, Romero-Soriano A (2023). Learning to Substitute Ingredients in Recipes. arXiv:2302.07960.
- Link: https://arxiv.org/pdf/2302.07960
- Strength: preprint (full PDF read). I did not confirm a peer-reviewed venue.
- Finding: Recipe1MSubs has 49,044 / 10,729 / 10,747 substitution samples (train/val/test) drawn from Recipe1M comments. GISMo is a graph network over FlavorGraph's 6,653 ingredients and 1,645 compounds, plus recipe context. It reached MRR 31.51, Hit@1 20.56 and Hit@10 54.27. A plain lookup table plus frequency reached MRR 27.66 and Hit@10 47.50. Food2Vec reached MRR 9.65 and FoodBERT 9.32. On substitution pairs absent from training, GISMo's MRR drops to 5.77 (46.53 in-distribution). Replacing its features with compound-aware metapath2vec embeddings changed nothing: MRR 31.22 against 31.25 for random initialisation.
- Design implication: The state of the art finds the reference substitute in its top 10 only about half the time, collapses on unseen pairs, and gains nothing from compound information. A curated lookup table is a strong, honest baseline for Foodi Dex.
- Caveats: Only one-to-one swaps were tested. Recipe1M is US-centric (the authors' own statement). "Correct" means matching a commenter's swap, not a tasted result.

### V11 — LLM fine-tuning for substitution (Senath et al.)
- Citation: Senath T, Athukorala K, Costa R, Ranathunga S, Kaur R (2024). Large Language Models for Ingredient Substitution in Food Recipes using Supervised Fine-tuning and Direct Preference Optimization. arXiv:2412.04922.
- Link: https://arxiv.org/abs/2412.04922
- Strength: preprint, **abstract only**.
- Finding: Mistral-7B with fine-tuning plus DPO reached Hit@1 22.04 on Recipe1MSub, which the abstract says beats "the strong baseline" on that corpus (GISMo reported Hit@1 20.56 in V10).
- Design implication: A tuned LLM is only marginally better than GISMo, still wrong about 78% of the time at top-1. An off-the-shelf LLM should not be trusted to pick swaps unaided.
- Caveats: The abstract does not mention any human evaluation.

### V12 — LLM substitution for phytochemical content (Rita et al.)
- Citation: Rita L, Southern J, Laponogov I, Higgins K, Veselkov K (2024). Optimizing Ingredient Substitution Using Large Language Models to Enhance Phytochemical Content in Recipes. arXiv:2409.08792. The peer-reviewed version in *MAKE* 6(4):131 returned HTTP 403, so I could not open it.
- Link: https://arxiv.org/abs/2409.08792
- Strength: preprint, **abstract only**.
- Finding: Fine-tuned GPT-3.5, DaVinci and TinyLlama models raised Hit@1 from 34.53% to 38.03% on the original GISMo data and from 40.24% to 54.46% on a refined version. The work produced 1,951 enriched pairings across 1,639 recipes.
- Design implication: This is the nearest published analogue to "swap toward a nutrient goal." Its validation was automatic, with no tasting.
- Caveats: The authors say the health claims rest on preclinical evidence. The abstract mentions no taste or acceptability test.

### V13 — Survey of ingredient substitution (Kim, Venkataramanan, Sheth)
- Citation: Kim H, Venkataramanan R, Sheth A. A Survey on Food Ingredient Substitutions. arXiv:2501.01958 (v1).
- Link: https://arxiv.org/html/2501.01958v1
- Strength: preprint. I read about 70% of the text; the end was truncated.
- Finding: The survey says "it is uncommon to find benchmark datasets for ingredient substitution." It notes that recipe-site comments used as gold standards come from people "not necessarily domain experts," and that flavour profiles are underused. It gives no empirical evidence that compound-based substitution works.
- Design implication: There is no accepted quality metric to adopt. Foodi Dex would need its own small acceptance test.
- Caveats: I did not read the LLM discussion, if there is one.

### V14 — Herbs and spices keep reformulated foods acceptable (Petersen et al.)
- Citation: Petersen KS, Fulgoni VL, Hopfer H, Hayes JE, Gooding R, Kris-Etherton P (2024). Using Herbs/Spices to Enhance the Flavor of Commonly Consumed Foods Reformulated to Be Lower in Overconsumed Dietary Components… *J Acad Nutr Diet*. doi:10.1016/j.jand.2023.07.025. PMID 37532099.
- Link: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%2210.1016/j.jand.2023.07.025%22&resultType=core&format=json (the ScienceDirect page returned 403)
- Strength: peer-reviewed, **abstract only**.
- Finding: Ten NHANES top-source foods were reformulated with less saturated fat, sodium and sugar, and herbs and spices were added. Blind tastings used 85–107 consumers per panel. Seven of 10 reformulations were rated superior or equal in overall liking. Modelled intake changes at 25–100% adoption were −2.9% to −11.4% saturated fat and −3.2% to −11.5% sodium.
- Design implication: A tested way to protect flavour while changing nutrients is to add herbs and spices, not only to swap ingredients. A rule set can include "add X to compensate."
- Caveats: These were expert culinary reformulations, not algorithmic ones. 3 of 10 failed parity. Secondary coverage, which I did not open, reports industry funding (McCormick Science Institute), so that is **unverified**.

### V15 — AI-enabled ingredient substitution: review and framework (Oz & Oz)
- Citation: Oz E, Oz F (2025). Artificial Intelligence-Enabled Ingredient Substitution in Food Systems: A Review and Conceptual Framework… *Foods* 14(22):3919.
- Link: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC12651232&resultType=core&format=json
- Strength: peer-reviewed narrative review, **abstract only**.
- Finding: Proposes four modules: flavour/aroma modelling, functional-property prediction, nutritional profiling, and constraint-based filtering. Names three gaps: no multimodal datasets linking composition to perception, limited explainability, and weak integration with real workflows.
- Design implication: Split "keeps flavour," "still cooks the same," "meets nutrient goal" and "allowed for this user" into separate checks.
- Caveats: Narrative, not systematic. No outcome data.

---

## 2. Nutrient-goal optimisation, and LLM accuracy and guardrails

### V16 — Review of linear programming for diets (van Dooren)
- Citation: van Dooren C (2018). A Review of the Use of Linear Programming to Optimize Diets, Nutritiously, Economically and Environmentally. *Frontiers in Nutrition* 5:48 (corrigendum 2022).
- Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC6021504/
- Strength: peer-reviewed review (I read the first ~85% of the text).
- Finding: Covers 52 LP studies, which used between 5 and 37 nutrient constraints. Without acceptability constraints, LP gives absurd answers: Dantzig's early model proposed 200 bouillon cubes a day. In Macdiarmid's model, the unconstrained diet had 7 foods; with acceptability constraints it kept 52 of 82 food groups. Vitamin D was the hardest constraint to meet in Maillot et al. The review says "no study has provided the ultimate solution to calculating acceptability" and recommends quadratic programming (QP) when the aim is small changes.
- Design implication: Model "keep the dish" as bounds on ingredient amounts plus a minimum-deviation objective (LP/QP). Expect some micronutrient goals, vitamin D for example, to be infeasible from one recipe.
- Caveats: The review covers diets, not single recipes.

### V17 — Smallest diet change that meets targets (Soden & Fletcher)
- Citation: Soden PM, Fletcher LR (1992). Modifying diets to satisfy nutritional requirements using linear programming. *British Journal of Nutrition* 68(3):565–572.
- Link: https://www.cambridge.org/core/journals/british-journal-of-nutrition/article/modifying-diets-to-satisfy-nutritional-requirements-using-linear-programming/0563BD5C7AC31A005EB64347BA468160
- Strength: peer-reviewed, **abstract only**.
- Finding: Starts from the person's current intake and uses LP to make "the smallest changes to the food quantities to meet specific targets." Sequential modification lets the person accept or reject each change. The tool was built with dietitians and used in UK hospitals.
- Design implication: This is the direct precedent for a "Suggest changes" button: minimal-change optimisation, one accepted change at a time.
- Caveats: There are no numbers in the abstract, and the paper is old.

### V18 — Mixed-integer LP for discrete portions (Sklan & Dariel)
- Citation: Sklan D, Dariel I (1993). Diet planning for humans using mixed-integer linear programming. *British Journal of Nutrition* 70(1):27–35.
- Link: https://www.cambridge.org/core/journals/british-journal-of-nutrition/article/diet-planning-for-humans-using-mixedinteger-linear-programming/E84EB86429B293CF732EE63DB7D2CBCD
- Strength: peer-reviewed, **abstract only**.
- Finding: Foods "generally eaten in whole units were defined as integers," and logical rules keep eating practices intact.
- Design implication: Use integer variables for countable ingredients such as eggs and cans, so suggestions are cookable ("add 1 egg," not "add 0.37 egg").
- Caveats: There are no numbers in the abstract.

### V19 — ChatGPT energy and macronutrient accuracy (Hoang et al.)
- Citation: Hoang YN, Chen Y-L, Ho DKN, et al. (2023). Consistency and Accuracy of Artificial Intelligence for Providing Nutritional Information. *JAMA Network Open* 6(12):e2350367.
- Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC10753390/
- Strength: peer-reviewed research letter (full text read).
- Finding: Across 222 foods, energy estimates fell within ±10% of the nutritionist's value for only 46.4–46.8% of items with GPT-4 and 39.2–44.1% with GPT-3.5. Protein was worst, at 35.9–42.5% of items within ±10%. Repeating the same query 5 times gave coefficients of variation of about 4.7–13% by nutrient.
- Design implication: More than half of LLM energy values miss by over 10% for plain foods. Foodi Dex must never display an LLM-generated nutrient number.
- Caveats: Only macronutrients were tested, on 2023 models with the ground truth from a Taiwanese database.

### V20 — ChatGPT-4 micronutrient estimates from meal photos (O'Hara et al.)
- Citation: O'Hara C, Kent G, Flynn AC, Gibney ER, Timon CM (2025). An Evaluation of ChatGPT for Nutrient Content Estimation from Meal Photographs. *Nutrients* 17(4):607.
- Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC11858203/
- Strength: peer-reviewed (full text read).
- Finding: Median percentage differences from measured values across 114 photos were: vitamin D −100%, potassium −49.5%, folate −38.6%, calcium −27.8%, iron −19.4%, vitamin C +44.9%. Energy was off by only 0.1%. Ten of 16 nutrients differed significantly. Food identification was good (F1 88.6%).
- Design implication: LLMs are worst exactly where Foodi Dex's goal sits, on vitamins and minerals. Micronutrient deltas must be computed from a food-composition database (see V24).
- Caveats: The input was photos, not text, so portion error contributes. Only one model and one run per photo were tested, without database access.

### V21 — ChatGPT dietary advice against guidelines (Ponzo et al.), including the allergy-diet study
- Citation: Ponzo V, Goitre I, Favaro E, et al. (2024). Is ChatGPT an Effective Tool for Providing Dietary Advice? *Nutrients* 16(4):469. It cites Niszczota P, Rybicka I (2023), *Nutrition* 112:112076.
- Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC10892804/
- Strength: peer-reviewed (full text read). The Niszczota study is cited second-hand; I did not find or open it, so it is **unverified**.
- Finding: Dietitians rated GPT-3.5's advice "appropriate" in 55.6% (sarcopenia) to 73.3% (NAFLD) of items. Two items contradicted guidelines and 12 guideline recommendations were missing. With multiple conditions, the advice conflicted. The cited allergy study assessed 56 ChatGPT diets and found portion and calorie errors, plus almond milk in a nut-free plan with no allergy warnings.
- Design implication: Hard-filter allergens and exclusions in code, after any LLM step, and never rely on the model to respect them.
- Caveats: This was GPT-3.5 in November 2023, single-turn prompts.

### V22 — LLM meal ideas corrected by an optimiser (Papastratis et al.)
- Citation: Papastratis I, Konstantinidis D, Daras P, Dimitropoulos K (2024). AI nutrition recommendation using a deep generative model and ChatGPT. *Scientific Reports* 14:14620.
- Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC11199627/
- Strength: peer-reviewed (I read about 96% of the text).
- Finding: ChatGPT's weekly plans for 20 users missed energy targets by 17.18–18.31% on average, with macronutrient accuracy of 61.79–74.29%. Passing ChatGPT's meal ideas through their portion-scaling optimiser cut the energy difference to 0.00 kcal and raised macronutrient accuracy to 77.14–81.07%.
- Design implication: This is the hybrid pattern with published numbers: the LLM proposes variety, and deterministic optimisation sets quantities and enforces targets.
- Caveats: The paper does not show that each ChatGPT meal's nutrient values were independently verified against a database.

### V23 — NutriBench: LLM carbohydrate estimation (Hua et al.)
- Citation: Hua A, Dhaliwal MP, Pullela L, Burke R, Qin Y (2025). NutriBench: A Dataset for Evaluating Large Language Models on Nutrition Estimation from Meal Descriptions. ICLR 2025. arXiv:2407.12843 (v6).
- Link: https://arxiv.org/html/2407.12843
- Strength: peer-reviewed conference paper (full text read).
- Finding: Across 11,857 meal descriptions from 11 countries, the best result (GPT-4o with chain-of-thought) was 66.82% within ±7.5 g carbohydrate. Mean across 12 models was 43.24%, or 47.46% with chain-of-thought. Retrieval from a food database gave mixed results and sometimes hurt. In a small test (72 queries, 3 nutritionists), nutritionists without lookup scored 42.45%.
- Design implication: Even the best LLM misses a third of the time on one macronutrient, and retrieval does not reliably fix it. Compute nutrients in code; do not have the model look them up.
- Caveats: Carbohydrates only. The nutritionist comparison was tiny.

### V24 — USDA FoodData Central API (licence and limits)
- Citation: USDA Agricultural Research Service (accessed 2026-10-28). FoodData Central API Guide.
- Link: http://fdc.nal.usda.gov/api-guide/
- Strength: official docs (no date shown).
- Finding: Data is "in the public domain" under CC0 1.0. A data.gov key is required. The limit is 1,000 requests per hour per IP (DEMO_KEY allows 30). Data types: Foundation, SR Legacy, FNDDS 2019–2020, Branded.
- Design implication: There is a free, public-domain source for deterministic micronutrient maths. Cache results under the owning store's rules, not as a second copy.
- Caveats: Coverage of micronutrients varies by data type. Not checked here.

---

## 3. Programmatic video for a Next.js/TypeScript stack

### V25 — Remotion licence and prices
- Citation: Remotion AG (2026). LICENSE.md; remotion.pro/license; Remotion Terms (labelled v5.0).
- Link: https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md ; https://www.remotion.pro/license ; https://www.remotion.dev/docs/terms
- Strength: official licence and official pricing page (no date shown beyond "© 2026"; accessed 2026-10-28).
- Finding: Remotion is free for "an individual," "a for-profit organization with up to 3 employees," non-profits, and evaluation. The pricing page lists "Unlimited commercial use" on the free licence. Companies of 4 or more need a Company License:
  - Creators: $25 per seat per month.
  - Automators: $0.01 per render, with a $100 per month minimum.
  - Enterprise: from $500 per month.
- Design implication: Foodi Dex, a personal app built by one person, can use Remotion at no licence cost, including for automated rendering.
- Caveats: The terms page is labelled v5.0 and "takes effect upon the release of Remotion 5.0," and LICENSE.md says "In Remotion 5.0, the license will slightly change." Re-check at upgrade.

### V26 — Remotion Lambda: limits, render times and cost
- Citation: Remotion (accessed 2026-10-28). Remotion Lambda; Cost example.
- Link: https://www.remotion.dev/docs/lambda ; https://www.remotion.dev/docs/lambda/cost-example
- Strength: official docs (vendor-measured).
- Finding: Lambda renders chunks in parallel and stitches them together. It suits videos under about 80 minutes of Full HD, with 1,000 concurrent Lambdas by default. Measured examples (Remotion 4.0.381, 2048 MB, us-east-1):
  - Hello World: $0.001, 7.56 s warm.
  - 1-minute video (1,440 frames): $0.017 and 18.91 s warm; $0.021 and 15.52 s cold.
  - 10-minute HD video: $0.103–0.108 and 56–61 s.
- Design implication: A 30–90 s recipe video should cost about 2 cents of AWS compute per render and take well under a minute.
- Caveats: The examples render existing footage, not SVG animation. S3, bandwidth and logs are extra. An AWS account is required.

### V27 — Remotion on Vercel Sandbox, and the other SSR options
- Citation: Remotion (accessed 2026-10-28). Vercel Sandbox; Server-side rendering.
- Link: https://www.remotion.dev/docs/vercel-sandbox ; https://www.remotion.dev/docs/ssr
- Strength: official docs.
- Finding: Each render runs in an ephemeral Linux VM "without managing Lambda or AWS infrastructure":
  - Timeout: 45 minutes on Hobby and 5 hours on Pro.
  - Concurrency: 10 renders on Hobby.
  - Speed: one machine, so slower than Lambda. The Sandbox "contains Chrome and FFmpeg and takes a few seconds to start up."
  - Vercel Functions run at most 800 s, so long renders need detached mode with progress polling.
  The SSR page lists the alternatives: Lambda (fastest), Vercel Sandbox ("easiest… for Vercel customers"), Node/Bun APIs, CLI, GitHub Actions, Docker, and Cloud Run (Alpha, "not actively being developed").
- Design implication: Rendering cannot happen inside a normal Vercel Function. The Sandbox keeps everything on Vercel, so no AWS account is needed.
- Caveats: Remotion states the Pro timeout as 5 h but Vercel's own page (V28) says 24 h. The Sandbox page gives no render-time figures.

### V28 — Vercel Sandbox pricing and quotas
- Citation: Vercel (last_updated 2026-09-10). Vercel Sandbox pricing and quotas.
- Link: https://vercel.com/docs/vercel-sandbox/pricing (canonical /docs/sandbox/pricing)
- Strength: official pricing page, dated 2026-09-10.
- Finding: Hobby includes, per month, 5 hours of active CPU, 420 GB-hours of memory and 5,000 sandbox creations. Sessions are capped at 45 minutes, with 10 concurrent sandboxes. Past the quota, creation pauses rather than billing. Pro is $0.128 per active-CPU-hour and $0.0212 per GB-hour, charged against the $20 monthly credit.
- Design implication: On Hobby, "a few renders a day" fits if each render uses a few CPU-minutes. Measure one render before setting a cadence goal.
- Caveats: I found no measured CPU-minutes for a Remotion render, so it is a **gap**.

### V29 — Motion Canvas
- Citation: Motion Canvas project (accessed 2026-10-28). GitHub repository; Rendering docs.
- Link: https://github.com/motion-canvas/motion-canvas ; https://motioncanvas.io/docs/rendering
- Strength: official docs.
- Finding: MIT licence, about 19.5k stars. It is "a specialized tool designed to create informative vector animations" synced to voice-over, written as TypeScript generators. You render by pressing RENDER in the browser editor, which saves an image sequence (PNG/JPEG/WebP) that you then turn into video "using a tool like ffmpeg."
- Design implication: The style fits well, but the documented workflow is manual, with no headless render. It does not meet "generated automatically on a schedule" out of the box.
- Caveats: No render-time figures.

### V30 — Revideo (headless fork of Motion Canvas)
- Citation: Revideo (accessed 2026-10-28). GitHub repository redotvideo/revideo.
- Link: https://github.com/redotvideo/revideo
- Strength: official docs (README).
- Finding: MIT licence. You can "render a project to a file with `renderVideo()`," and it "runs anywhere Node and a headless browser run," including Cloud Run. It describes itself as "the engine behind Midrender."
- Design implication: This is the scriptable route if Motion Canvas's API is preferred over React.
- Caveats: The page does not state maintenance status or last release date; it has 56 open issues. Tied to one company's product.

### V31 — Lottie (and Lottie inside Remotion)
- Citation: Airbnb (accessed 2026-10-28). lottie-web; Remotion `<Lottie>` docs.
- Link: https://github.com/airbnb/lottie-web ; https://www.remotion.dev/docs/lottie/lottie
- Strength: official docs.
- Finding: lottie-web is MIT-licensed. It renders After Effects animations exported to JSON with Bodymovin, using SVG, canvas or HTML renderers. The page does not mention video export. Remotion's `<Lottie animationData=…>` plays Lottie JSON inside a Remotion composition, so it can be rendered to MP4.
- Design implication: Lottie is a format for per-creature idle and cooking loops, not a renderer. Authoring it needs After Effects or a Lottie editor.
- Caveats: Authoring cost and tooling for Lottie were not researched.

### V32 — Rive (and Rive inside Remotion)
- Citation: Rive (accessed 2026-10-28). Pricing; Remotion `@remotion/rive`.
- Link: https://rive.app/pricing ; https://www.remotion.dev/docs/rive/
- Strength: official pricing page (no date shown) and official docs.
- Finding: Pricing per seat per month:
  - Free: $0, but exports carry a Rive splash screen.
  - Cadet: $9, up to 3 seats.
  - Voyager: $32.
  - Enterprise: $120, for organisations with $10M+ revenue.
  Runtimes are "MIT open-source" with "no runtime fees." The comparison table lists MP4/WebM/GIF/PNG-sequence export, but which tier includes them is unclear. `@remotion/rive` "provides a component for rendering Rive animations in Remotion."
- Design implication: Rive could rig the creatures with state machines (chop, stir, plate). On the Free tier the splash screen is the cost.
- Caveats: I could not confirm which tiers include video export.

### V33 — Importing SVG art into Remotion
- Citation: Remotion (accessed 2026-10-28). Import from Figma.
- Link: https://remotion.dev/docs/figma
- Strength: official docs.
- Finding: "Copy as SVG" and paste into Remotion Studio is "the more reliable method." Converting the SVG to JSX lets each part become a React element. Direct layer copy supports only some layer types; "Images are a notable exclusion."
- Design implication: The existing creature SVGs can be animated part by part (arms, lids, steam) in React. PNG-only creatures can only be moved as whole sprites.
- Caveats: The page does not show how to animate parts. That is left to a linked third-party blog.

---

## 4. Generative AI video APIs (late 2026) and text-to-speech

### V34 — Gemini API pricing: Gemini Omni Flash video and Gemini TTS
- Citation: Google AI for Developers (Last updated 2026-10-28 UTC). Gemini Developer API pricing.
- Link: https://ai.google.dev/gemini-api/docs/pricing
- Strength: official pricing page, dated 2026-10-28.
- Finding: `gemini-omni-1.1-flash` is paid tier only. Input is $1.50 per 1M tokens and video output $17.50 per 1M tokens, billed at "5,792 tokens per second of 720p video," which the page equates to about $0.10 per second. It is the only video-output model on the page; Veo is not listed. TTS (`gemini-2.5-flash-preview-tts`) has a free tier; paid is $0.50 per 1M input tokens and $10.00 per 1M output tokens.
- Design implication: A 60 s video at 720p costs about $6.08 per attempt (**computed**: 5,792 × $17.50/1M × 60), before retries.
- Caveats: The page gives no retry or success rates.

### V35 — Gemini Omni Flash capabilities
- Citation: Google AI for Developers (accessed 2026-10-28). Generate and edit videos with Gemini Omni Flash.
- Link: https://ai.google.dev/gemini-api/docs/omni
- Strength: official docs (I read about 94% of the page).
- Finding:
  - Resolution and format: 360p, 720p (default), 1080p and 4K (both upscaled); 16:9 or 9:16.
  - Length: extensions generate 3–10 s continuations, and the prompt guide says "extend videos by 10s, up to a total length of 40s." The Vertex reference page (V38 link) gives DURATION as 3–10 s per call.
  - Inputs: one image, first and last frames, or several subject reference images (no maximum stated); video references up to 3 clips of up to 3 s each.
  - Output: audio by default; SynthID watermark on every video.
  - The page makes **no explicit claim** that characters or style stay consistent across shots.
- Design implication: A 60 s recipe video needs at least 6 clips stitched together, and nothing documented keeps 5–10 different creatures on-model across them.
- Caveats: The tail of the page was not read.

### V36 — Veo 3.1 preview on the Gemini API is shut down
- Citation: Google AI for Developers (Last updated 2026-10-22 UTC). Video generation page.
- Link: https://ai.google.dev/gemini-api/docs/video
- Strength: official docs, dated 2026-10-22.
- Finding: The Veo 3.1 preview models (`veo-3.1-generate-preview`, `-fast-`, `-lite-`) "[were] shut down on October 22, 2026." The page directs users to Gemini Omni Flash, or to GA Veo models on the Gemini Enterprise Agent Platform (formerly Vertex AI).
- Design implication: Video model IDs are being retired on a timescale of months. Any generative pipeline needs a model-swap seam and a fallback.
- Caveats: None.

### V37 — Google Cloud Agent Platform (Vertex) prices for Veo and Omni
- Citation: Google Cloud (accessed 2026-10-28; I found no date on the page). Agent Platform / Vertex AI generative AI pricing.
- Link: https://cloud.google.com/vertex-ai/generative-ai/pricing (fetched raw HTML)
- Strength: official pricing page (no date shown).
- Finding: Prices are listed "per 1 count." Veo 3.1 Lite is the cheapest; Veo 2 is $0.50.

  | Model | With audio | Video only |
  |---|---|---|
  | Veo 3.1, 720p/1080p | $0.40 | $0.20 |
  | Veo 3.1, 4K | $0.60 | $0.40 |
  | Veo 3.1 Fast, 720p / 1080p / 4K | $0.10 / $0.12 / $0.30 | $0.08 / $0.10 / $0.25 |
  | Veo 3.1 Lite, 720p / 1080p | $0.05 / $0.08 | $0.03 / $0.05 |

  Omni output is billed at 1,931 / 5,792 / 8,688 / 17,376 tokens per second at 360p / 720p / 1080p / 4K. At $17.50 per 1M tokens that is about $0.034 / $0.101 / $0.152 / $0.304 per second (**computed**).
- Design implication: A 60 s video costs about $1.80 with Veo 3.1 Lite (video only, 720p), $4.80 with Fast (video only), and $24 with Veo 3.1 with audio (**computed**). The cost is per attempt.
- Caveats: The page does not define "count." It is very likely one second: Runway resells Veo 3.1 at 40 credits/s = $0.40/s (V41), which matches. That is still an inference, so **unverified**.

### V38 — Veo 3.1 GA: specifications, retirement date, reference images
- Citation: Google Cloud (Last updated 2026-10-28 UTC). Veo 3.1 model page; Generate videos from references.
- Link: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate ; https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-references
- Strength: official docs, dated 2026-10-28.
- Finding:
  - Status: `veo-3.1-generate-001` is GA, released November 17, 2025, with a "Retirement date: November 17, 2026 or later." Available only in us-central1.
  - Clips: 4, 6 or 8 s each, and only 8 s when using reference images. 24 fps, up to 4 outputs per prompt.
  - Reference images: "up to three images of a single person, character, or product," and "Veo preserves the subject's appearance." Lite does not support reference images.
- Design implication: Character consistency is documented for **one** subject per generation, while a recipe video has several creatures. The GA model's retirement date falls about 20 days from today, which is just past the 18-day window.
- Caveats: The page lists "Pay-as-you-go: Not supported; Fixed quota: Supported." I could not confirm what that means for a small account, so it is **unverified**.

### V39 — OpenAI Sora 2 API is shut down
- Citation: OpenAI (accessed 2026-10-28). sora-2 model page.
- Link: https://developers.openai.com/api/docs/models/sora-2
- Strength: official docs.
- Finding: "The Sora 2 models and Videos API were shut down on September 24, 2026," with "no one-to-one replacement." The deprecation notice is dated 2026-03-24. Historical prices: sora-2 $0.10/s at 720p; sora-2-pro $0.30 / $0.50 / $0.70 per second.
- Design implication: OpenAI is not an option for generated video. This is a second example of model churn.
- Caveats: None.

### V40 — OpenAI video guide (historical): length and consistency features
- Citation: OpenAI (accessed 2026-10-28). Video generation guide (kept "for historical reference").
- Link: https://developers.openai.com/api/docs/guides/video-generation
- Strength: official docs (describes a retired product).
- Finding: Up to 20 s per generation, plus up to six extensions to 120 s in total. Reusable non-human "characters" (up to 2 per video) were offered for "stronger visual consistency." "Copyrighted characters and copyrighted music are rejected."
- Design implication: The closest any vendor came to a multi-character solution is now retired. Do not plan around it.
- Caveats: Historical only.

### V41 — Runway API pricing (including resold third-party models and TTS)
- Citation: Runway (accessed 2026-10-28; no update date shown). API pricing.
- Link: https://docs.dev.runwayml.com/guides/pricing/
- Strength: official pricing page (no date shown; dated promotions run to 2026-11-30).
- Finding: Credits cost $0.01. Rates per second of video:

  | Model | Credits/s | $/s |
  |---|---|---|
  | gen4_turbo | 5 | $0.05 |
  | gen4.5 | 12 | $0.12 |
  | Veo 3.1 (audio / no audio) | 40 / 20 | $0.40 / $0.20 |
  | Veo 3.1 Fast (audio / no audio) | 15 / 10 | $0.15 / $0.10 |
  | Gemini Omni Flash 1.1, 720p | 10 | $0.10 |
  | Kling 3.0 Standard, no audio | 9 | $0.09 |
  | Kling 4.0, 720p (list / discounted to 2026-11-30) | 15.7 / 12.56 | $0.157 / $0.1256 |

  ElevenLabs voices are resold too: eleven_v3 costs 1 credit per 50 characters.
- Design implication: The cheapest generated option found is gen4_turbo at $0.05/s, so $3.00 for 60 s (**computed**). It is image-to-video only.
- Caveats: Reseller prices can differ from the model owners' own prices.

### V42 — Runway API model list (clip lengths)
- Citation: Runway (accessed 2026-10-28). API models.
- Link: https://docs.dev.runwayml.com/guides/models/
- Strength: official docs.
- Finding: Maximum lengths per generation: Kling 4.0 3–30 s; WAN 3.0 2–30 s; Seedance 2.5 30 s; Kling 3.0 3–15 s; Kling 2.5 Turbo 5 or 10 s. Gen-4.5 and Gen-4 Turbo lengths are not stated. The page makes **no explicit claim** about character or style consistency across shots.
- Design implication: 30 s single clips exist, but consistency is still unproven.
- Caveats: Lengths are missing for several models.

### V43 — Runway Gen-4 consistency claims
- Citation: Runway (accessed 2026-10-28; post date not shown). Introducing Runway Gen-4.
- Link: https://runway.com/research/introducing-runway-gen-4
- Strength: vendor marketing.
- Finding: Claims users can "precisely generate consistent characters, locations and objects across scenes," and that one reference image keeps a character consistent.
- Design implication: Treat this as a claim to test on two creature references before setting any consistency goal.
- Caveats: There is no evaluation, no stated limits and no date.

### V44 — Luma Agents API pricing
- Citation: Luma AI (accessed 2026-10-28). Luma Agents API pricing guide.
- Link: https://docs.agents.lumalabs.ai/guides/pricing/ (and `/index.md`)
- Strength: official pricing page (no date shown; says video rates "may change before general availability").
- Finding: Ray 3.2 is priced only in credits: 100 credits for 5 s at 720p, 300 for 10 s, and 400 or 1,200 at 1080p. "The dollar value of a credit depends on your account's plan or contract." No maximum clip length or consistency feature is mentioned.
- Design implication: No dollar price can be budgeted from Luma's own page.
- Caveats: A third-party figure of about $0.003 per credit came from search snippets only, so it is **unverified**.

### V45 — Kling official API pricing (not verified)
- Citation: Kuaishou (accessed 2026-10-28). Kling AI Developer Platform pricing.
- Link: https://kling.ai/dev/pricing (redirected from klingai.com/global/dev/pricing)
- Strength: official pricing page, but its content did not render (JavaScript), so it is **unverified**.
- Finding: I could not read any price. Third-party sites conflict (for example "$0.14 a unit" against "$0.08–0.17/s"), so I report none. The verified proxy is Runway's resale price in V41.
- Design implication: Use V41 for Kling cost estimates.
- Caveats: This is a gap.

### V46 — OpenAI text-to-speech pricing
- Citation: OpenAI (accessed 2026-10-28; no date shown). API pricing.
- Link: https://developers.openai.com/api/docs/pricing
- Strength: official pricing page (no date shown).
- Finding: gpt-4o-mini-tts is $0.60 per 1M text input tokens and $12.00 per 1M audio output tokens. tts-1 is $15.00 per 1M characters and tts-1-hd $30.00.
- Design implication: About 900 characters of narration (assumed to be about 60 s) costs about $0.014 with tts-1 (**computed**). Narration cost is negligible.
- Caveats: The 900-characters-per-minute figure is my assumption.

### V47 — ElevenLabs API pricing
- Citation: ElevenLabs (accessed 2026-10-28; no date shown). API pricing.
- Link: https://elevenlabs.io/pricing/api
- Strength: official pricing page (no date shown).
- Finding: v4, v3 and v2 Multilingual are $0.08 per 1K characters. Flash/Turbo, v4 Turbo and v3 Conversational are $0.04 per 1K characters. Starter is $6 per month for 75,000 v4/v3/v2 characters. The free allowance appears to be 10,000 characters (the table rows are unlabelled, so this is inferred).
- Design implication: About $0.04–0.07 per 60 s narration (**computed**, 900 characters).
- Caveats: The page does not state whether free-tier TTS output may be used commercially or needs attribution.

### V48 — Google Cloud Text-to-Speech pricing
- Citation: Google Cloud (accessed 2026-10-28; no date found). Text-to-Speech pricing.
- Link: https://cloud.google.com/text-to-speech/pricing (fetched raw HTML)
- Strength: official pricing page (no date shown).
- Finding:
  - Chirp 3 HD: $30 per 1M characters, with the first 1M characters per month free.
  - Neural2: $16 per 1M, with 1M free.
  - Standard: $4 per 1M, with 4M free.
  - Studio: $160 per 1M.
  - Gemini 2.5 Flash TTS: $0.50 in and $10.00 out per 1M tokens, at "25 tokens per second of audio."
- Design implication: Daily narration stays inside the free 1M characters. Gemini TTS works out to about $0.015 per minute of audio (**computed**: 1,500 tokens × $10/1M).
- Caveats: WaveNet appears on the page at $4 per 1M, sharing Standard's SKU. That may be a page error; I report it as shown.

---

## 5. Imitating a studio's style

### V49 — US Copyright Office: style is not protected, passing off may apply
- Citation: U.S. Copyright Office (July 2024). Copyright and Artificial Intelligence, Part 1: Digital Replicas (Section III, "Protection of Artistic Style").
- Link: https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-1-Digital-Replicas-Report.pdf
- Strength: government report (full section read).
- Finding: Copyright "does not protect artistic style as a separate element of a work." There may be a remedy where an "in the style of" output copies "protectible elements of a particular work." The Office names the Lanham Act's "prohibitions on passing off and unfair competition" and the FTC's view that mimicry deceiving consumers or exploiting a creator's reputation can be unfair competition. It does not recommend a new style right "at this time."
- Design implication: A generic flat-vector look is legal. Copying Kurzgesagt's specific characters, its bird, or its frames is not safe. Implying any affiliation, such as "Kurzgesagt-style videos" in the UI or marketing, invites a passing-off claim.
- Caveats: This is US law only. Kurzgesagt is a German studio, and German/EU unfair-competition law was not researched (**gap**).

### V50 — OpenAI refuses prompts in the style of a living artist
- Citation: OpenAI (March 25, 2025). Addendum to GPT-4o System Card: Native image generation, §2.4.2 "Artist Styles."
- Link: https://cdn.openai.com/11998be9-5319-4302-bfbf-1167e093f1fb/Native_Image_Generation_System_Card.pdf
- Strength: official docs.
- Finding: "We added a refusal which triggers when a user attempts to generate an image in the style of a living artist," because the capability "has raised important questions and concerns within the creative community."
- Design implication: Prompts naming a studio or artist may be refused, and they inherit the ethical problem. Describe the target look in neutral terms (flat vector, limited palette, soft gradients, rounded geometry) and never name Kurzgesagt in prompts.
- Caveats: This is OpenAI's image policy. News reports say OpenAI allowed "broader studio styles," but I did not open a primary source, so that is **unverified**. I found no equivalent clause for Google, Runway or Luma (**gap**).

### V51 — Kurzgesagt's own videos wrongly flagged as "AI slop" (2026)
- Citation: Kotaku (August 8, 2026). YouTube mistakenly penalizes popular science channel Kurzgesagt for AI-generated slop.
- Link: https://kotaku.com/youtube-mistakenly-penalizes-popular-science-channel-kurzgesagt-for-ai-generated-slop-2000722702
- Strength: news.
- Finding: Kurzgesagt posted on July 31, 2026 that "YouTube's automatic AI detection tools wrongly think that our very much human-made videos are AI Slop." The article says the channel's style "has taken up considerable residence in AI models" and that Kurzgesagt had previously warned about AI-generated material flooding the web.
- Design implication: The studio is publicly harmed by the flood of look-alikes. Imitating it adds to that harm. A distinct Foodi Dex house style avoids both the ethical cost and any detection or flagging risk if videos are ever posted publicly.
- Caveats: News report, quoting an X post I did not open directly.

### V52 — Kurzgesagt FAQ and the 2025 "AI Slop" episode
- Citation: Kurzgesagt (accessed 2026-10-28). FAQ; TVmaze episode listing "AI Slop Is Killing Our Channel" (aired Oct 7, 2025).
- Link: https://kurzgesagt.org/faq ; https://www.tvmaze.com/episodes/3391530/kurzgesagt-in-a-nutshell-2025-10-07-ai-slop-is-killing-our-channel
- Strength: official site (FAQ headings only; the answers did not render) and a third-party listing.
- Finding: The FAQ has questions on using, uploading and translating their videos, and "I've seen someone stealing your content. What can I do?" I found **no published guidance on style imitation or fan content**. The 2025 episode on AI slop exists, but I did not get its transcript.
- Design implication: There is no permission to lean on. Treat the style as theirs to define and keep Foodi Dex's look distinct.
- Caveats: The FAQ answers and the episode content are **unverified**.

---

## 6. Do cooking videos help, and accessibility

### V53 — Video vs recipe card: a cooking experiment with focus groups (Surgenor et al.)
- Citation: Surgenor D, Hollywood L, Furey S, … Dean M (2017). The impact of video technology on learning: A cooking skills experiment. *Appetite* 114:306–312.
- Link: https://openaccess.city.ac.uk/id/eprint/17312/
- Strength: peer-reviewed, **abstract only** (the full author manuscript is available but I did not read it).
- Finding: 141 women were split across four conditions: recipe card only, card plus video, card plus segmented video, and card plus on-demand video. Focus groups described video as aiding comprehension, giving "real-time reassurance," helping them learn new skills, and making cooking more enjoyable.
- Design implication: This supports pairing video with step text (the "Cook" button design), with video segmented per step rather than one long clip.
- Caveats: The outcomes are qualitative perceptions. The abstract reports no measured success rate.

### V54 — Cooking-show randomised trial in college students (Clifford et al.)
- Citation: Clifford D, Anderson J, Auld G, Champ J (2009). Good Grubbin': Impact of a TV Cooking Show for College Students Living Off Campus. *J Nutr Educ Behav* 41(3):194–200.
- Link: https://experts.nau.edu/en/publications/good-grubbin-impact-of-a-tv-cooking-show-for-college-students-liv/
- Strength: peer-reviewed RCT, **abstract only**.
- Finding: n = 101, four 15-minute episodes against a control. Knowledge rose significantly (P < .05, still present at 4 months). There were no significant changes in self-efficacy, barriers or fruit-and-vegetable intake: "little impact on dietary behaviors."
- Design implication: Do not set a goal that the video changes what people eat or cook. A realistic claim is that it aids understanding of a recipe.
- Caveats: This was TV-style content in 2009, not short step clips.

### V55 — Non-visual access to cooking instructions (Li et al.)
- Citation: Li FM, Wang A, Carrington P, Kane SK (2024). A Recipe for Success? Exploring Strategies for Improving Non-Visual Access to Cooking Instructions. ASSETS 2024. arXiv:2407.19065.
- Link: https://arxiv.org/abs/2407.19065
- Strength: peer-reviewed conference paper, **abstract only**.
- Finding: Interviews with 20 people with vision impairments and 4 instructors. Recipe access problems vary by cooking stage, including "the heavy burden of hand-washing to interact with recipe readers." The paper identifies preferred recipe structure.
- Design implication: The text steps under the video must work on their own, be navigable step by step, and suit hands-busy use.
- Caveats: The specific recommendations are in the body, which I did not read.

### V56 — WCAG 2.2: success criteria for time-based media
- Citation: W3C (12 December 2024). Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation.
- Link: https://www.w3.org/TR/WCAG22/
- Strength: standard.
- Finding:
  - 1.2.2 Captions (Prerecorded) and 1.2.3 Audio Description or Media Alternative are both Level A. Each applies "except when the media is a media alternative for text and is clearly labeled as such."
  - 1.2.5 Audio Description (AA) has no such clause in its text; the exemption sits in the glossary definition of "synchronized media."
  - 2.2.2 Pause, Stop, Hide requires a pause control for moving content that starts automatically and lasts more than 5 s.
  - 2.3.1 limits flashing to 3 times per second.
- Design implication: If the step text is the complete, canonical content and the video is labelled as an alternative to it, the caption and audio-description duties largely fall away. If the video adds narration or information not in the text, captions are required.
- Caveats: Labelling has to be real: the video may present no more information than the text.

### V57 — Understanding SC 1.2.8: what counts as a "media alternative for text"
- Citation: W3C WAI (accessed 2026-10-28). Understanding Success Criterion 1.2.8: Media Alternative (Prerecorded).
- Link: https://www.w3.org/WAI/WCAG22/Understanding/media-alternative-prerecorded.html
- Strength: standard (informative).
- Finding: A media alternative for text is "media that presents no more information than is already presented in text." Media labelled that way falls outside "synchronized media," so it needs no separate alternative.
- Design implication: Generate the narration script from the step text, and add nothing to it. The video then qualifies as an alternative, and the text below it does the accessibility work.
- Caveats: 1.2.8 is Level AAA. The definition is what matters for the Level A and AA criteria.

---

## 7. Scheduling batch jobs (Vercel, Supabase)

### V58 — Vercel Cron Jobs limits
- Citation: Vercel (last_updated 2026-07-15). Usage & Pricing for Cron Jobs.
- Link: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Strength: official docs, dated 2026-07-15.
- Finding: Every plan allows 100 cron jobs per project. On Hobby the minimum interval is "once per day," with "per-hour (±59 min)" precision, and more frequent expressions "will fail during deployment." Pro allows once per minute. Cron jobs invoke Functions and are billed as Functions.
- Design implication: On Hobby, "new recipes get a video within 24 h" is the cadence the platform allows. Hourly generation would need Pro, or a trigger outside Vercel.
- Caveats: Older copies of this page show different limits, so cite this dated version.

### V59 — Vercel Functions limits
- Citation: Vercel (last_updated 2026-08-24). Vercel Functions Limits.
- Link: https://vercel.com/docs/functions/limitations
- Strength: official docs, dated 2026-08-24.
- Finding: Maximum duration on Hobby is 300 s (default and maximum). Pro allows 800 s, or 1,800 s in beta. Hobby memory is 2 GB / 1 vCPU. Bundles are limited to 250 MB uncompressed, or 5 GB in beta for large functions. Request and response bodies are limited to 4.5 MB. For unlimited duration the page points to Vercel Workflows.
- Design implication: The cron function should only enqueue the job and start a Sandbox or Lambda render (V27, V26). It should not render or wait on a generative API.
- Caveats: Workflows pricing was not researched.

### V60 — Supabase Cron (pg_cron)
- Citation: Supabase (accessed 2026-10-28). Supabase Cron.
- Link: https://supabase.com/docs/guides/cron
- Strength: official docs (no date shown).
- Finding: Built on pg_cron, schedules can run "anywhere from every second to once a year." Jobs can be SQL, database functions, or HTTP requests such as Edge Functions. History is kept in `cron.job_run_details`. Supabase recommends no more than 8 concurrent jobs, each running no more than 10 minutes.
- Design implication: A Postgres-side scheduler is finer-grained than Vercel Hobby, and run history is recorded for free. That satisfies "background work … needs a recorded failure."
- Caveats: No plan restrictions are stated.

### V61 — Scheduling Edge Functions from pg_cron
- Citation: Supabase (accessed 2026-10-28). Scheduling Edge Functions.
- Link: https://supabase.com/docs/guides/functions/schedule-functions
- Strength: official docs.
- Finding: pg_cron and pg_net call `/functions/v1/<name>` on a schedule, with the secret key stored in Vault. The function needs `verify_jwt` disabled. Any role that can log in can read the decrypted key in `net.http_request_queue` while the request waits.
- Design implication: pg_cron can trigger a Vercel route or an Edge Function to start a render. Lock down which roles can log in to the database.
- Caveats: None noted.

### V62 — Supabase Edge Function limits
- Citation: Supabase (accessed 2026-10-28). Edge Functions limits.
- Link: https://supabase.com/docs/guides/functions/limits
- Strength: official docs (no date shown).
- Finding: 256 MB memory; 2 s of CPU time per request; wall-clock 150 s on Free and 400 s on paid plans; bundled function size 20 MB.
- Design implication: Edge Functions can orchestrate and poll but cannot render video: there is no room for headless Chrome and FFmpeg within 20 MB and 256 MB (my inference, not stated by Supabase).
- Caveats: The rendering conclusion is inferred.

### V63 — Supabase Free plan project pausing
- Citation: Supabase (accessed 2026-10-28). Project Pausing.
- Link: https://supabase.com/docs/guides/platform/free-project-pausing
- Strength: official docs.
- Finding: Free projects are paused if they "[do] not receive sufficient user database activity over the past week." Paused projects can be restored within 1 year. Paid projects are never paused. The page does not say whether pg_cron activity counts.
- Design implication: A daily job on a Free project could stop silently if the app goes unused for a week. Either monitor for this or accept the risk explicitly.
- Caveats: Whether pg_cron activity counts is **unverified**.

### V64 — GitHub Actions billing (an alternative render runner)
- Citation: GitHub (accessed 2026-10-28). GitHub Actions billing.
- Link: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Strength: official docs.
- Finding: GitHub Free includes $12 of compute per month for private repositories. Linux 2-core runners cost $0.006 per minute, which is about 2,000 minutes (**computed**). Standard runners in public repositories are free.
- Design implication: A scheduled Actions workflow running `npx remotion render` (Remotion lists GitHub Actions as an option in V27) is a no-AWS, no-Pro fallback.
- Caveats: Scheduled-workflow timing guarantees were not covered on this page.

---

## Options compared

### A. Explainer video

Cost figures are per 60-second video per attempt, from V26, V34, V37 and V41.

| | Programmatic (Remotion + existing creature SVG/PNG, TTS narration) | Generative AI (Veo / Omni / Runway / Kling) | Hybrid (programmatic scenes plus a few generated inserts, e.g. a sizzle or pour shot) |
|---|---|---|---|
| **Licence / access** | Free for an individual (V25) | Paid API only. Sora is shut down (V39). The Veo 3.1 preview is shut down (V36). GA Veo 3.1 retires "Nov 17 2026 or later" (V38) | Both |
| **Compute cost per 60 s** | About $0.02 on Lambda (V26), or inside Vercel Hobby's 5 CPU-h per month (V28), or GitHub Actions (V64). Narration about $0.01–0.07 (V46–V48) | About $1.80 (Veo 3.1 Lite, no audio, 720p), $3.00 (Runway gen4_turbo), $4.80 (Veo 3.1 Fast, no audio), $6.08 (Omni Flash 720p), $24 (Veo 3.1 with audio), **per attempt, before retries** (V37, V41, V34) | Programmatic base plus about $0.25–1.00 per 5–10 s insert (computed from the same rates) |
| **Consistency with the Foodi Dex creatures** | Exact: the art *is* the asset | Documented only for **one subject per generation**, via up to 3 reference images (V38). Omni makes no consistency claim (V35). Runway's claim is marketing (V43). The multi-character feature (Sora) is retired (V40) | Creatures stay exact. Inserts must avoid creatures |
| **Step accuracy** | Steps come from the recipe data, so they match the text exactly (V56–V57) | The model invents actions, and clips are 4–10 s (V38, V35), so steps can drift from the text | Steps stay from data |
| **Accessibility** | Narration script equals the step text, so the video qualifies as a "media alternative for text" (V56–V57) | Generated audio adds content, so captions are needed (V56) | As programmatic |
| **Effort** | High at first: build a scene grammar of prep, cook and plate verbs as React components and rig the SVG parts (V33). Low per recipe after that | Low first build, high ongoing effort: prompt tuning, QA of every clip, model migrations (V36, V38, V39) | Highest: two pipelines |
| **Schedule fit** | Vercel cron (daily on Hobby, V58) or pg_cron (V60) triggers Sandbox/Lambda (V27, V26) | Same trigger; asynchronous jobs need polling outside the 300 s function limit (V59) | Same |
| **Style ethics** | House style based on Foodi Dex's own creatures; no studio named (V49–V52) | Prompts naming a studio risk refusal (V50) and copy its look (V49, V51) | As programmatic |

Reading: within about 18 days, the programmatic route is the only one whose cost, consistency and correctness are all supported by evidence here. Generative video is optional, and only for creature-free inserts.

### B. "Suggest changes" for nutrient goals while keeping the flavour profile

| | Rules + optimisation (curated substitution table + LP/MILP over amounts) | LLM only | Hybrid (LLM proposes candidates; code filters and decides quantities) |
|---|---|---|---|
| **Nutrient correctness** | Deterministic from FDC (V24); per-serving parsing error is about 34.5 kcal (V9) | Poor: micronutrients off by −100% to +45% (V20); under half of energy values within ±10% (V19) | Deterministic, as rules: the LLM never supplies a number (V22 pattern) |
| **Keeps flavour** | Bounds and a minimum-deviation objective (V16, V17) plus known swaps (V7) and herb/spice compensation (V14). No algorithm is validated by tasting | No tasting validation. Fine-tuned LLMs reach Hit@1 22% (V11) | LLM breadth plus the rules' bounds. Still untested by tasting |
| **Coverage of unusual ingredients** | Limited to the table. Learned models also fail on unseen pairs (GISMo out-of-distribution MRR 5.77, V10) | Broad but unreliable (V8, V10, V11) | Broader, gated |
| **Safety (allergens, exclusions)** | Enforced in code | Known failures, e.g. almond milk in a nut-free plan (V21) | Enforced in code after the LLM |
| **Feasibility** | Some goals, such as vitamin D, may be infeasible from one recipe (V16). Must report "can't meet X here" | Will claim success anyway (V22: 17–18% energy misses) | Optimiser reports infeasible honestly |
| **Explainability** | High: "swap A→B, +Z mg iron" | Low | Medium–high |
| **Effort** | Medium: curate about 100–300 swaps, write the LP (solver dependency to check against the lockfile) | Low | Medium–high |

Reading: compound overlap (FlavorDB, V2–V3) should not be the flavour test (V1, V4–V6, V10). Use known substitutions plus bounded amount changes, compute every nutrient delta in code, and if an LLM is used, use it only to propose candidates.

---

## Gaps

1. **No study tastes algorithmic substitutions.** None of the substitution papers (V8–V13) ran a cooking or tasting test of model-proposed swaps. The only acceptability data are chef-made reformulations (V14, 7 of 10 at parity). Foodi Dex would need its own small check, for example the owner cooking and rating N suggested variants.
2. **No direct test of whether compound overlap predicts acceptable substitutes.** The evidence is indirect: GISMo's compound-aware features add nothing (V10); flavour-based recommenders lose to co-occurrence (V6, abstract only); pairing via shared compounds is called discredited (V4, abstract only).
3. **LLM micronutrient accuracy from text recipes** (as opposed to photos) was not found. V20 uses photos, and V19 and V23 cover macronutrients only.
4. **Render time and CPU cost of an SVG-animation Remotion video on Vercel Sandbox** are undocumented. V26's figures are for footage on Lambda. One measured render is needed before setting a nightly-capacity goal.
5. **Unread or unverified pricing:** Kling's own page did not render (V45). Luma gives no dollar value for a credit (V44). The meaning of Vertex's "count" unit is inferred (V37). Veo's "Pay-as-you-go: Not supported" listing is unexplained (V38).
6. **Generative retry and failure rates** (how many attempts give a usable clip) are not published by any vendor, so true per-video cost is unknown.
7. **Kurzgesagt's position on style imitation:** the FAQ answers did not render, and I had no episode transcript (V52). German/EU unfair-competition law was not researched (V49 is US only). I found no Google, Runway or Luma policy text on prompts that name a living artist or studio (V50 covers OpenAI only).
8. **Evidence that short step videos improve cooking success** is thin: one qualitative experiment (V53) and one RCT showing knowledge but no behaviour change (V54). I found no measured comparison of "completed the dish" between video and text.
9. **Supabase Free pausing and pg_cron:** whether scheduled jobs count as activity is not documented (V63).
10. **The Remotion 5.0 licence change** is announced but not yet in effect (V25). Re-check before upgrading.
