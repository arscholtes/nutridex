// What each vitamin and mineral does, in the words of Commission Regulation (EU) No 432/2012, the
// list of health claims permitted on food. Claims are copied from its annex; grouping them into
// effects is this Dex's own. tests/nutrient-claims.test.ts checks each one against the annex.
//
// Two claims are left out. The regulation's vitamin C claim about exercise rests on a daily dose of
// 200 mg, not on a food. Its sodium claim is about eating less, so it belongs with the cautions.
import type { SeedCompoundEffect, SeedEffect, SeedSource } from "./facts.ts";

export const NUTRIENT_SOURCE: SeedSource = {
  key: "eu-health-claims",
  title: "Commission Regulation (EU) No 432/2012: the list of permitted health claims",
  url: "https://www.legislation.gov.uk/eur/2012/432/annex",
  doi: null,
  pmid: null,
  studyType: "regulatory review",
  population: "General population. Each claim follows a scientific opinion from the European Food Safety Authority.",
  year: 2012,
  limitations:
    "What EU law lets a food label say, read here as retained in UK law. A claim means the nutrient contributes to that function at adequate intake, not that eating more improves it. The underlying EFSA opinions were not read one by one.",
};

// A regulator's verdict rather than trials read here, so these stop short of A.
const GRADE = "B";

export const NUTRIENT_EFFECTS: SeedEffect[] = [
  { slug: "energy-metabolism", name: "Energy from food", bodySystem: "energy", direction: "benefit" },
  { slug: "tiredness", name: "Less tiredness and fatigue", bodySystem: "energy", direction: "benefit" },
  { slug: "metabolism", name: "Metabolism", bodySystem: "energy", direction: "benefit" },
  { slug: "immune-system", name: "Immune system", bodySystem: "immune", direction: "benefit" },
  { slug: "nervous-system", name: "Nervous system", bodySystem: "brain", direction: "benefit" },
  { slug: "psychological-function", name: "Psychological function", bodySystem: "brain", direction: "benefit" },
  { slug: "cognitive-function", name: "Cognitive function", bodySystem: "brain", direction: "benefit" },
  { slug: "bones", name: "Bones", bodySystem: "bones", direction: "benefit" },
  { slug: "teeth-and-gums", name: "Teeth and gums", bodySystem: "bones", direction: "benefit" },
  { slug: "connective-tissue", name: "Connective tissue and cartilage", bodySystem: "bones", direction: "benefit" },
  { slug: "muscle-function", name: "Muscle function", bodySystem: "muscle", direction: "benefit" },
  { slug: "heart-and-blood-vessels", name: "Heart and blood vessels", bodySystem: "heart", direction: "benefit" },
  { slug: "blood-pressure", name: "Blood pressure", bodySystem: "heart", direction: "benefit" },
  { slug: "red-blood-cells", name: "Red blood cells and oxygen", bodySystem: "blood", direction: "benefit" },
  { slug: "blood-clotting", name: "Blood clotting", bodySystem: "blood", direction: "benefit" },
  { slug: "homocysteine", name: "Homocysteine metabolism", bodySystem: "blood", direction: "benefit" },
  { slug: "nutrient-use", name: "Absorbing and using other nutrients", bodySystem: "digestion", direction: "benefit" },
  { slug: "digestion", name: "Digestive enzymes", bodySystem: "digestion", direction: "benefit" },
  { slug: "liver", name: "Liver function", bodySystem: "digestion", direction: "benefit" },
  { slug: "skin", name: "Skin", bodySystem: "skin", direction: "benefit" },
  { slug: "hair", name: "Hair", bodySystem: "skin", direction: "benefit" },
  { slug: "nails", name: "Nails", bodySystem: "skin", direction: "benefit" },
  { slug: "mucous-membranes", name: "Mucous membranes", bodySystem: "skin", direction: "benefit" },
  { slug: "vision", name: "Vision", bodySystem: "eyes", direction: "benefit" },
  { slug: "oxidative-stress", name: "Protecting cells from oxidative stress", bodySystem: "cells", direction: "benefit" },
  { slug: "cell-growth", name: "Cell division and growth", bodySystem: "cells", direction: "benefit" },
  { slug: "hormones", name: "Hormones", bodySystem: "hormones", direction: "benefit" },
  { slug: "reproduction", name: "Fertility and pregnancy", bodySystem: "hormones", direction: "benefit" },
];

/** Nutrient reference values from Annex XIII Part A to Regulation (EU) No 1169/2011, by compound. */
export const REFERENCE_VALUES: Record<string, { label: string; amount: number; unit: "mg" | "µg" }> = {
  "vitamin-a": { label: "Vitamin A", amount: 800, unit: "µg" },
  "thiamin": { label: "Thiamin", amount: 1.1, unit: "mg" },
  "riboflavin": { label: "Riboflavin", amount: 1.4, unit: "mg" },
  "niacin": { label: "Niacin", amount: 16, unit: "mg" },
  "pantothenic-acid": { label: "Pantothenic acid", amount: 6, unit: "mg" },
  "vitamin-b6": { label: "Vitamin B6", amount: 1.4, unit: "mg" },
  "folate": { label: "Folic acid", amount: 200, unit: "µg" },
  "vitamin-b12": { label: "Vitamin B12", amount: 2.5, unit: "µg" },
  "vitamin-c": { label: "Vitamin C", amount: 80, unit: "mg" },
  "vitamin-d": { label: "Vitamin D", amount: 5, unit: "µg" },
  "vitamin-e": { label: "Vitamin E", amount: 12, unit: "mg" },
  "vitamin-k1": { label: "Vitamin K", amount: 75, unit: "µg" },
  "calcium": { label: "Calcium", amount: 800, unit: "mg" },
  "copper": { label: "Copper", amount: 1, unit: "mg" },
  "iron": { label: "Iron", amount: 14, unit: "mg" },
  "magnesium": { label: "Magnesium", amount: 375, unit: "mg" },
  "manganese": { label: "Manganese", amount: 2, unit: "mg" },
  "phosphorus": { label: "Phosphorus", amount: 700, unit: "mg" },
  "potassium": { label: "Potassium", amount: 2000, unit: "mg" },
  "selenium": { label: "Selenium", amount: 55, unit: "µg" },
  "zinc": { label: "Zinc", amount: 10, unit: "mg" },
};

// The same annex: a food supplies a significant amount at 15% of the reference value per 100 g.
const SIGNIFICANT_SHARE = 0.15;

/** Choline has no reference value; its claims state their own minimum. */
export const CHOLINE_BAR_PER_100G = 82.5;

/**
 * The amount per 100 g at which a food may claim to be a source of a nutrient.
 * @param compound [string] a compound slug with a reference value
 * @return [number] in the unit of its reference value
 */
export function sourceBar(compound: string): number {
  return Number((REFERENCE_VALUES[compound].amount * SIGNIFICANT_SHARE).toFixed(4));
}

/** Each nutrient's claims under each effect. */
export const NUTRIENT_CLAIMS: { compound: string; effect: string; claims: string[] }[] = [
  {
    compound: "vitamin-a",
    effect: "immune-system",
    claims: [
      "Vitamin A contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "vitamin-a",
    effect: "nutrient-use",
    claims: [
      "Vitamin A contributes to normal iron metabolism",
    ],
  },
  {
    compound: "vitamin-a",
    effect: "skin",
    claims: [
      "Vitamin A contributes to the maintenance of normal skin",
    ],
  },
  {
    compound: "vitamin-a",
    effect: "mucous-membranes",
    claims: [
      "Vitamin A contributes to the maintenance of normal mucous membranes",
    ],
  },
  {
    compound: "vitamin-a",
    effect: "vision",
    claims: [
      "Vitamin A contributes to the maintenance of normal vision",
    ],
  },
  {
    compound: "vitamin-a",
    effect: "cell-growth",
    claims: [
      "Vitamin A has a role in the process of cell specialisation",
    ],
  },
  {
    compound: "thiamin",
    effect: "energy-metabolism",
    claims: [
      "Thiamine contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "thiamin",
    effect: "nervous-system",
    claims: [
      "Thiamine contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "thiamin",
    effect: "psychological-function",
    claims: [
      "Thiamine contributes to normal psychological function",
    ],
  },
  {
    compound: "thiamin",
    effect: "heart-and-blood-vessels",
    claims: [
      "Thiamine contributes to the normal function of the heart",
    ],
  },
  {
    compound: "riboflavin",
    effect: "energy-metabolism",
    claims: [
      "Riboflavin contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "riboflavin",
    effect: "tiredness",
    claims: [
      "Riboflavin contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "riboflavin",
    effect: "nervous-system",
    claims: [
      "Riboflavin contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "riboflavin",
    effect: "red-blood-cells",
    claims: [
      "Riboflavin contributes to the maintenance of normal red blood cells",
    ],
  },
  {
    compound: "riboflavin",
    effect: "nutrient-use",
    claims: [
      "Riboflavin contributes to the normal metabolism of iron",
    ],
  },
  {
    compound: "riboflavin",
    effect: "skin",
    claims: [
      "Riboflavin contributes to the maintenance of normal skin",
    ],
  },
  {
    compound: "riboflavin",
    effect: "mucous-membranes",
    claims: [
      "Riboflavin contributes to the maintenance of normal mucous membranes",
    ],
  },
  {
    compound: "riboflavin",
    effect: "vision",
    claims: [
      "Riboflavin contributes to the maintenance of normal vision",
    ],
  },
  {
    compound: "riboflavin",
    effect: "oxidative-stress",
    claims: [
      "Riboflavin contributes to the protection of cells from oxidative stress",
    ],
  },
  {
    compound: "niacin",
    effect: "energy-metabolism",
    claims: [
      "Niacin contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "niacin",
    effect: "tiredness",
    claims: [
      "Niacin contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "niacin",
    effect: "nervous-system",
    claims: [
      "Niacin contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "niacin",
    effect: "psychological-function",
    claims: [
      "Niacin contributes to normal psychological function",
    ],
  },
  {
    compound: "niacin",
    effect: "skin",
    claims: [
      "Niacin contributes to the maintenance of normal skin",
    ],
  },
  {
    compound: "niacin",
    effect: "mucous-membranes",
    claims: [
      "Niacin contributes to the maintenance of normal mucous membranes",
    ],
  },
  {
    compound: "pantothenic-acid",
    effect: "energy-metabolism",
    claims: [
      "Pantothenic acid contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "pantothenic-acid",
    effect: "tiredness",
    claims: [
      "Pantothenic acid contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "pantothenic-acid",
    effect: "cognitive-function",
    claims: [
      "Pantothenic acid contributes to normal mental performance",
    ],
  },
  {
    compound: "pantothenic-acid",
    effect: "hormones",
    claims: [
      "Pantothenic acid contributes to normal synthesis and metabolism of steroid hormones, vitamin D and some neurotransmitters",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "energy-metabolism",
    claims: [
      "Vitamin B6 contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "tiredness",
    claims: [
      "Vitamin B6 contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "metabolism",
    claims: [
      "Vitamin B6 contributes to normal cysteine synthesis",
      "Vitamin B6 contributes to normal protein and glycogen metabolism",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "immune-system",
    claims: [
      "Vitamin B6 contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "nervous-system",
    claims: [
      "Vitamin B6 contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "psychological-function",
    claims: [
      "Vitamin B6 contributes to normal psychological function",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "red-blood-cells",
    claims: [
      "Vitamin B6 contributes to normal red blood cell formation",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "homocysteine",
    claims: [
      "Vitamin B6 contributes to normal homocysteine metabolism",
    ],
  },
  {
    compound: "vitamin-b6",
    effect: "hormones",
    claims: [
      "Vitamin B6 contributes to the regulation of hormonal activity",
    ],
  },
  {
    compound: "folate",
    effect: "tiredness",
    claims: [
      "Folate contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "folate",
    effect: "metabolism",
    claims: [
      "Folate contributes to normal amino acid synthesis",
    ],
  },
  {
    compound: "folate",
    effect: "immune-system",
    claims: [
      "Folate contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "folate",
    effect: "psychological-function",
    claims: [
      "Folate contributes to normal psychological function",
    ],
  },
  {
    compound: "folate",
    effect: "red-blood-cells",
    claims: [
      "Folate contributes to normal blood formation",
    ],
  },
  {
    compound: "folate",
    effect: "homocysteine",
    claims: [
      "Folate contributes to normal homocysteine metabolism",
    ],
  },
  {
    compound: "folate",
    effect: "cell-growth",
    claims: [
      "Folate has a role in the process of cell division",
    ],
  },
  {
    compound: "folate",
    effect: "reproduction",
    claims: [
      "Folate contributes to maternal tissue growth during pregnancy",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "energy-metabolism",
    claims: [
      "Vitamin B12 contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "tiredness",
    claims: [
      "Vitamin B12 contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "immune-system",
    claims: [
      "Vitamin B12 contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "nervous-system",
    claims: [
      "Vitamin B12 contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "psychological-function",
    claims: [
      "Vitamin B12 contributes to normal psychological function",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "red-blood-cells",
    claims: [
      "Vitamin B12 contributes to normal red blood cell formation",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "homocysteine",
    claims: [
      "Vitamin B12 contributes to normal homocysteine metabolism",
    ],
  },
  {
    compound: "vitamin-b12",
    effect: "cell-growth",
    claims: [
      "Vitamin B12 has a role in the process of cell division",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "energy-metabolism",
    claims: [
      "Vitamin C contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "tiredness",
    claims: [
      "Vitamin C contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "immune-system",
    claims: [
      "Vitamin C contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "nervous-system",
    claims: [
      "Vitamin C contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "psychological-function",
    claims: [
      "Vitamin C contributes to normal psychological function",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "bones",
    claims: [
      "Vitamin C contributes to normal collagen formation for the normal function of bones",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "teeth-and-gums",
    claims: [
      "Vitamin C contributes to normal collagen formation for the normal function of gums",
      "Vitamin C contributes to normal collagen formation for the normal function of teeth",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "connective-tissue",
    claims: [
      "Vitamin C contributes to normal collagen formation for the normal function of cartilage",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "heart-and-blood-vessels",
    claims: [
      "Vitamin C contributes to normal collagen formation for the normal function of blood vessels",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "nutrient-use",
    claims: [
      "Vitamin C contributes to the regeneration of the reduced form of vitamin E",
      "Vitamin C increases iron absorption",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "skin",
    claims: [
      "Vitamin C contributes to normal collagen formation for the normal function of skin",
    ],
  },
  {
    compound: "vitamin-c",
    effect: "oxidative-stress",
    claims: [
      "Vitamin C contributes to the protection of cells from oxidative stress",
    ],
  },
  {
    compound: "vitamin-d",
    effect: "immune-system",
    claims: [
      "Vitamin D contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "vitamin-d",
    effect: "bones",
    claims: [
      "Vitamin D contributes to the maintenance of normal bones",
    ],
  },
  {
    compound: "vitamin-d",
    effect: "teeth-and-gums",
    claims: [
      "Vitamin D contributes to the maintenance of normal teeth",
    ],
  },
  {
    compound: "vitamin-d",
    effect: "muscle-function",
    claims: [
      "Vitamin D contributes to the maintenance of normal muscle function",
    ],
  },
  {
    compound: "vitamin-d",
    effect: "nutrient-use",
    claims: [
      "Vitamin D contributes to normal absorption/utilisation of calcium and phosphorus",
      "Vitamin D contributes to normal blood calcium levels",
    ],
  },
  {
    compound: "vitamin-d",
    effect: "cell-growth",
    claims: [
      "Vitamin D has a role in the process of cell division",
    ],
  },
  {
    compound: "vitamin-e",
    effect: "oxidative-stress",
    claims: [
      "Vitamin E contributes to the protection of cells from oxidative stress",
    ],
  },
  {
    compound: "vitamin-k1",
    effect: "bones",
    claims: [
      "Vitamin K contributes to the maintenance of normal bones",
    ],
  },
  {
    compound: "vitamin-k1",
    effect: "blood-clotting",
    claims: [
      "Vitamin K contributes to normal blood clotting",
    ],
  },
  {
    compound: "choline",
    effect: "metabolism",
    claims: [
      "Choline contributes to normal lipid metabolism",
    ],
  },
  {
    compound: "choline",
    effect: "homocysteine",
    claims: [
      "Choline contributes to normal homocysteine metabolism",
    ],
  },
  {
    compound: "choline",
    effect: "liver",
    claims: [
      "Choline contributes to the maintenance of normal liver function",
    ],
  },
  {
    compound: "calcium",
    effect: "energy-metabolism",
    claims: [
      "Calcium contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "calcium",
    effect: "nervous-system",
    claims: [
      "Calcium contributes to normal neurotransmission",
    ],
  },
  {
    compound: "calcium",
    effect: "bones",
    claims: [
      "Calcium is needed for the maintenance of normal bones",
    ],
  },
  {
    compound: "calcium",
    effect: "teeth-and-gums",
    claims: [
      "Calcium is needed for the maintenance of normal teeth",
    ],
  },
  {
    compound: "calcium",
    effect: "muscle-function",
    claims: [
      "Calcium contributes to normal muscle function",
    ],
  },
  {
    compound: "calcium",
    effect: "blood-clotting",
    claims: [
      "Calcium contributes to normal blood clotting",
    ],
  },
  {
    compound: "calcium",
    effect: "digestion",
    claims: [
      "Calcium contributes to the normal function of digestive enzymes",
    ],
  },
  {
    compound: "calcium",
    effect: "cell-growth",
    claims: [
      "Calcium has a role in the process of cell division and specialisation",
    ],
  },
  {
    compound: "copper",
    effect: "energy-metabolism",
    claims: [
      "Copper contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "copper",
    effect: "immune-system",
    claims: [
      "Copper contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "copper",
    effect: "nervous-system",
    claims: [
      "Copper contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "copper",
    effect: "connective-tissue",
    claims: [
      "Copper contributes to maintenance of normal connective tissues",
    ],
  },
  {
    compound: "copper",
    effect: "nutrient-use",
    claims: [
      "Copper contributes to normal iron transport in the body",
    ],
  },
  {
    compound: "copper",
    effect: "skin",
    claims: [
      "Copper contributes to normal skin pigmentation",
    ],
  },
  {
    compound: "copper",
    effect: "hair",
    claims: [
      "Copper contributes to normal hair pigmentation",
    ],
  },
  {
    compound: "copper",
    effect: "oxidative-stress",
    claims: [
      "Copper contributes to the protection of cells from oxidative stress",
    ],
  },
  {
    compound: "iron",
    effect: "energy-metabolism",
    claims: [
      "Iron contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "iron",
    effect: "tiredness",
    claims: [
      "Iron contributes to the reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "iron",
    effect: "immune-system",
    claims: [
      "Iron contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "iron",
    effect: "cognitive-function",
    claims: [
      "Iron contributes to normal cognitive function",
    ],
  },
  {
    compound: "iron",
    effect: "red-blood-cells",
    claims: [
      "Iron contributes to normal formation of red blood cells and haemoglobin",
      "Iron contributes to normal oxygen transport in the body",
    ],
  },
  {
    compound: "iron",
    effect: "cell-growth",
    claims: [
      "Iron has a role in the process of cell division",
    ],
  },
  {
    compound: "magnesium",
    effect: "energy-metabolism",
    claims: [
      "Magnesium contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "magnesium",
    effect: "tiredness",
    claims: [
      "Magnesium contributes to a reduction of tiredness and fatigue",
    ],
  },
  {
    compound: "magnesium",
    effect: "metabolism",
    claims: [
      "Magnesium contributes to electrolyte balance",
      "Magnesium contributes to normal protein synthesis",
    ],
  },
  {
    compound: "magnesium",
    effect: "nervous-system",
    claims: [
      "Magnesium contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "magnesium",
    effect: "psychological-function",
    claims: [
      "Magnesium contributes to normal psychological function",
    ],
  },
  {
    compound: "magnesium",
    effect: "bones",
    claims: [
      "Magnesium contributes to the maintenance of normal bones",
    ],
  },
  {
    compound: "magnesium",
    effect: "teeth-and-gums",
    claims: [
      "Magnesium contributes to the maintenance of normal teeth",
    ],
  },
  {
    compound: "magnesium",
    effect: "muscle-function",
    claims: [
      "Magnesium contributes to normal muscle function",
    ],
  },
  {
    compound: "magnesium",
    effect: "cell-growth",
    claims: [
      "Magnesium has a role in the process of cell division",
    ],
  },
  {
    compound: "manganese",
    effect: "energy-metabolism",
    claims: [
      "Manganese contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "manganese",
    effect: "bones",
    claims: [
      "Manganese contributes to the maintenance of normal bones",
    ],
  },
  {
    compound: "manganese",
    effect: "connective-tissue",
    claims: [
      "Manganese contributes to the normal formation of connective tissue",
    ],
  },
  {
    compound: "manganese",
    effect: "oxidative-stress",
    claims: [
      "Manganese contributes to the protection of cells from oxidative stress",
    ],
  },
  {
    compound: "phosphorus",
    effect: "energy-metabolism",
    claims: [
      "Phosphorus contributes to normal energy-yielding metabolism",
    ],
  },
  {
    compound: "phosphorus",
    effect: "bones",
    claims: [
      "Phosphorus contributes to the maintenance of normal bones",
    ],
  },
  {
    compound: "phosphorus",
    effect: "teeth-and-gums",
    claims: [
      "Phosphorus contributes to the maintenance of normal teeth",
    ],
  },
  {
    compound: "phosphorus",
    effect: "cell-growth",
    claims: [
      "Phosphorus contributes to normal function of cell membranes",
    ],
  },
  {
    compound: "potassium",
    effect: "nervous-system",
    claims: [
      "Potassium contributes to normal functioning of the nervous system",
    ],
  },
  {
    compound: "potassium",
    effect: "muscle-function",
    claims: [
      "Potassium contributes to normal muscle function",
    ],
  },
  {
    compound: "potassium",
    effect: "blood-pressure",
    claims: [
      "Potassium contributes to the maintenance of normal blood pressure",
    ],
  },
  {
    compound: "selenium",
    effect: "immune-system",
    claims: [
      "Selenium contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "selenium",
    effect: "hair",
    claims: [
      "Selenium contributes to the maintenance of normal hair",
    ],
  },
  {
    compound: "selenium",
    effect: "nails",
    claims: [
      "Selenium contributes to the maintenance of normal nails",
    ],
  },
  {
    compound: "selenium",
    effect: "oxidative-stress",
    claims: [
      "Selenium contributes to the protection of cells from oxidative stress",
    ],
  },
  {
    compound: "selenium",
    effect: "hormones",
    claims: [
      "Selenium contributes to the normal thyroid function",
    ],
  },
  {
    compound: "selenium",
    effect: "reproduction",
    claims: [
      "Selenium contributes to normal spermatogenesis",
    ],
  },
  {
    compound: "zinc",
    effect: "metabolism",
    claims: [
      "Zinc contributes to normal acid-base metabolism",
      "Zinc contributes to normal carbohydrate metabolism",
      "Zinc contributes to normal macronutrient metabolism",
      "Zinc contributes to normal metabolism of fatty acids",
      "Zinc contributes to normal protein synthesis",
    ],
  },
  {
    compound: "zinc",
    effect: "immune-system",
    claims: [
      "Zinc contributes to the normal function of the immune system",
    ],
  },
  {
    compound: "zinc",
    effect: "cognitive-function",
    claims: [
      "Zinc contributes to normal cognitive function",
    ],
  },
  {
    compound: "zinc",
    effect: "bones",
    claims: [
      "Zinc contributes to the maintenance of normal bones",
    ],
  },
  {
    compound: "zinc",
    effect: "nutrient-use",
    claims: [
      "Zinc contributes to normal metabolism of vitamin A",
    ],
  },
  {
    compound: "zinc",
    effect: "skin",
    claims: [
      "Zinc contributes to the maintenance of normal skin",
    ],
  },
  {
    compound: "zinc",
    effect: "hair",
    claims: [
      "Zinc contributes to the maintenance of normal hair",
    ],
  },
  {
    compound: "zinc",
    effect: "nails",
    claims: [
      "Zinc contributes to the maintenance of normal nails",
    ],
  },
  {
    compound: "zinc",
    effect: "vision",
    claims: [
      "Zinc contributes to the maintenance of normal vision",
    ],
  },
  {
    compound: "zinc",
    effect: "oxidative-stress",
    claims: [
      "Zinc contributes to the protection of cells from oxidative stress",
    ],
  },
  {
    compound: "zinc",
    effect: "cell-growth",
    claims: [
      "Zinc contributes to normal DNA synthesis",
      "Zinc has a role in the process of cell division",
    ],
  },
  {
    compound: "zinc",
    effect: "hormones",
    claims: [
      "Zinc contributes to the maintenance of normal testosterone levels in the blood",
    ],
  },
  {
    compound: "zinc",
    effect: "reproduction",
    claims: [
      "Zinc contributes to normal fertility and reproduction",
    ],
  },
];

export const NUTRIENT_COMPOUND_EFFECTS: SeedCompoundEffect[] = NUTRIENT_CLAIMS.map((n) => {
  const choline = n.compound === "choline";
  const bar = choline ? CHOLINE_BAR_PER_100G : sourceBar(n.compound);
  const unit = choline ? "mg" : REFERENCE_VALUES[n.compound].unit;
  return {
    compound: n.compound,
    effect: n.effect,
    summary: n.claims.map((c) => `${c}.`).join(" "),
    doseContext: `A food qualifies at ${bar} ${unit} per 100 g or more.`,
    onset: null,
    minFoodPer100g: bar,
    grade: GRADE,
    source: NUTRIENT_SOURCE.key,
  };
});
