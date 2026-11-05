// Sourced facts the engine's first check needs: fat helps carotenoids absorb, and juicing leaves
// fiber in the pulp; and the one effect the Dex walk from carrot to pumpkin needs, beta-carotene's
// on skin color. Each was read in its source (abstract, or the table named) before it was written
// here; a number appears only where the source gives one. What each vitamin and mineral does comes
// from nutrient-claims.ts.
import { NUTRIENT_COMPOUND_EFFECTS, NUTRIENT_EFFECTS, NUTRIENT_SOURCE } from "./nutrient-claims.ts";

export type SeedSource = {
  key: string;
  title: string;
  url: string;
  doi: string | null;
  pmid: string | null;
  studyType: string;
  population: string;
  year: number;
  limitations: string;
};

export type SeedModifier = {
  /** One compound, or a ChEBI class with the members the source measured. */
  target: { compound: string } | { chebiClass: number; measured: string[] };
  modifierCompound: string | null;
  condition: string | null;
  direction: "enhances" | "inhibits";
  magnitude: string;
  mechanism: string;
  grade: "A" | "B" | "C" | "D";
  source: string;
};

/** A ChEBI class, with the seeded compounds ChEBI places under it. */
export type SeedClass = { chebiId: number; name: string; members: string[]; source: string };

/** A rule the seed once wrote and has since replaced: the seed deletes it by exactly this key. */
export type RetiredModifier = { target: string; condition: string; source: string };

export type SeedPrepEffect = {
  compound: string;
  prepMethod: string;
  retentionFactor: number | null;
  direction: "decreases" | "increases" | "unchanged";
  note: string;
  source: string;
};

/** Something a compound does. Neutral when the change is neither good nor bad by itself. */
export type SeedEffect = { slug: string; name: string; bodySystem: string; direction: "benefit" | "risk" | "neutral" };

export type SeedCompoundEffect = {
  compound: string;
  effect: string;
  summary: string;
  doseContext: string;
  onset: string | null;
  /** The amount per 100 g a food must reach for the claim to apply to it; null when the source sets no bar. */
  minFoodPer100g: number | null;
  grade: "A" | "B" | "C" | "D";
  source: string;
};

export const SOURCES: SeedSource[] = [
  {
    key: "brown-2004",
    title: "Carotenoid bioavailability is higher from salads ingested with full-fat than with fat-reduced salad dressings as measured with electrochemical detection",
    url: "https://pubmed.ncbi.nlm.nih.gov/15277161/",
    doi: "10.1093/ajcn/80.2.396",
    pmid: "15277161",
    studyType: "rct",
    population: "7 adults, randomized crossover; salads with dressing holding 0, 6 or 28 g canola oil",
    year: 2004,
    limitations: "Very small (n = 7); single meals; one oil; lutein not reported",
  },
  {
    key: "unlu-2005",
    title: "Carotenoid absorption from salad and salsa by humans is enhanced by the addition of avocado or avocado oil",
    url: "https://pubmed.ncbi.nlm.nih.gov/15735074/",
    doi: "10.1093/jn/135.3.431",
    pmid: "15735074",
    studyType: "rct",
    population: "Healthy adults, two crossover studies of 11; salad with 0, 12 or 24 g avocado fat",
    year: 2005,
    limitations: "Small; single meals; no fat dose below 12 g; measured lutein, not zeaxanthin",
  },
  {
    key: "chen-lin-2003",
    title: "Effect of Juice Extraction on Dietary Fiber Availability of Fruits and Vegetables",
    url: "https://doi.org/10.6691/JCNS.200303_28(1).0003",
    doi: "10.6691/JCNS.200303_28(1).0003",
    pmid: null,
    studyType: "in-vitro",
    population: "Apple, grape, watermelon, pineapple, orange and carrot, juiced with a hand press or a blender",
    year: 2003,
    limitations: "Laboratory measurement of six foods, not beet or kale; per-food figures beyond carrot and grape not read",
  },
  {
    key: "licht-2010",
    title: "Effects of apples and specific apple components on the cecal environment of conventional rats: role of apple pectin",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2822772/",
    doi: "10.1186/1471-2180-10-13",
    pmid: "20089145",
    studyType: "in-vitro",
    population: "Pectin measured in apple, purée, cloudy and clear juice and pomace from one harvest (Table 4)",
    year: 2010,
    limitations: "Industrial juices, not home juicing; juice in g per litre against fruit in g per kg, so no retention factor",
  },
  {
    key: "chebi-256",
    title: "ChEBI release 256, read through EMBL-EBI's Ontology Lookup Service on 2026-10-15",
    url: "https://www.ebi.ac.uk/ols4/ontologies/chebi",
    doi: null,
    pmid: null,
    studyType: "database",
    population: "Chemical entities and their is_a classes (238,150 terms)",
    year: 2026,
    limitations: "Class membership is ChEBI's curation, as of this release",
  },
  {
    key: "micozzi-1988",
    title: "Carotenodermia in men with elevated carotenoid intake from foods and beta-carotene supplements",
    url: "https://pubmed.ncbi.nlm.nih.gov/3421202/",
    doi: "10.1093/ajcn/48.4.1061",
    pmid: "3421202",
    studyType: "rct",
    population:
      "30 men, 5 per group for 42 days: 30 or 12 mg beta-carotene a day, 272 g cooked carrots, 300 g cooked broccoli, 180 g tomato juice, or placebo",
    year: 1988,
    limitations: "Small (5 per group); men only; 42 days; only the 30 mg supplement group showed definite carotenodermia",
  },
  NUTRIENT_SOURCE,
];

export const CLASSES: SeedClass[] = [
  { chebiId: 23042, name: "carotene", members: ["alpha-carotene", "beta-carotene", "lycopene"], source: "chebi-256" },
];

const FAT_HELPS = "Carotenoids are fat-soluble and are absorbed with dietary fat";

export const MODIFIERS: SeedModifier[] = [
  {
    target: { chebiClass: 23042, measured: ["alpha-carotene", "beta-carotene", "lycopene"] },
    modifierCompound: null,
    condition: "dietary fat present",
    direction: "enhances",
    magnitude: "Essentially none absorbed from a salad with fat-free dressing; more with 6 g of oil, more again with 28 g",
    mechanism: FAT_HELPS,
    grade: "B",
    source: "brown-2004",
  },
  {
    target: { compound: "lutein-zeaxanthin" },
    modifierCompound: null,
    condition: "dietary fat present",
    direction: "enhances",
    magnitude: "Adding avocado (12 or 24 g of fat) to a salad raised lutein absorption about 5 times",
    mechanism: FAT_HELPS,
    grade: "B",
    source: "unlu-2005",
  },
];

// Brown 2004 was three rules, one per carotene, before it became one rule on ChEBI's carotene class.
export const RETIRED_MODIFIERS: RetiredModifier[] = ["beta-carotene", "alpha-carotene", "lycopene"].map((target) => ({
  target,
  condition: "dietary fat present",
  source: "brown-2004",
}));

export const PREP_EFFECTS: SeedPrepEffect[] = [
  {
    compound: "dietary-fiber",
    prepMethod: "juiced",
    retentionFactor: null,
    direction: "decreases",
    note: "Juice keeps about 10% of the fiber in the same weight of produce; 80–95% stays in the pulp (carrot juice kept 5%)",
    source: "chen-lin-2003",
  },
  {
    compound: "pectin",
    prepMethod: "juiced",
    retentionFactor: null,
    direction: "decreases",
    note: "Juice keeps only water-soluble pectin, and clarified juice none; the rest leaves with the pulp",
    source: "licht-2010",
  },
];

// Neutral: carotenodermia is a visible change the trial reports, not a harm or a benefit it measured.
export const EFFECTS: SeedEffect[] = [{ slug: "skin-color", name: "Skin color", bodySystem: "skin", direction: "neutral" }, ...NUTRIENT_EFFECTS];

export const COMPOUND_EFFECTS: SeedCompoundEffect[] = [
  {
    compound: "beta-carotene",
    effect: "skin-color",
    summary:
      "Skin turned yellow-orange (carotenodermia) in the five men taking 30 mg of purified beta-carotene a day, once plasma carotenoids passed 4.0 mg/L, and stayed so for 14 to more than 42 days after they stopped. No other group showed definite carotenodermia, including 272 g of cooked carrots a day.",
    doseContext: "30 mg of purified beta-carotene a day; 12 mg a day and every food group fell short within 42 days",
    onset: "25 to 42 days",
    minFoodPer100g: null,
    grade: "B",
    source: "micozzi-1988",
  },
  ...NUTRIENT_COMPOUND_EFFECTS,
];
