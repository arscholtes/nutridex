// What the engine reads and what it returns. Plain data keyed by slug: the engine never touches the
// database, so every number in a profile can be traced to an input here.

export type Grade = "A" | "B" | "C" | "D";
export type MassUnit = "g" | "mg" | "µg";

export type RecipeInput = {
  slug: string;
  servings: number;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
};

export type RecipeIngredientInput = {
  id: string;
  ingredientSlug: string;
  grams: number;
  /** The ingredient's own prep, applied before any step that uses it. */
  prepMethod: string;
};

export type RecipeStepInput = {
  position: number;
  prepMethod: string | null;
  recipeIngredientIds: string[];
};

/** One ingredient_compound row. A null amount means no source measured it, never zero. */
export type AmountFact = {
  ingredientSlug: string;
  compoundSlug: string;
  amountPer100g: number | null;
  unit: MassUnit | null;
  amountLow: number | null;
  amountHigh: number | null;
};

export type PrepEffectFact = {
  compoundSlug: string;
  prepMethod: string;
  /** Share of the compound that survives; null when no source gives a number. */
  retentionFactor: number | null;
  direction: PrepDirection | null;
  note: string | null;
};

export type PrepDirection = "decreases" | "increases" | "unchanged";

export type ModifierFact = {
  /** The rule's id in its store, carried onto the flag so a reader can trace it. */
  id: string;
  targetCompoundSlug: string;
  modifierCompoundSlug: string | null;
  condition: string | null;
  direction: "enhances" | "inhibits";
  magnitude: string | null;
  mechanism: string | null;
  grade: Grade;
  /** Names of ingredients that carry the modifier compound, for the "add one" suggestion. */
  modifierFoundIn: string[];
  basis: Basis;
};

/** Whether a rule's source measured this compound, or the rule reaches it through its class. */
export type Basis = "measured" | "by-class";

export type CautionFact = {
  compoundSlug: string | null;
  ingredientSlug: string | null;
  kind: string;
  summary: string;
  grade: Grade;
};

export type CompoundEffectFact = {
  compoundSlug: string;
  effectSlug: string;
  direction: "benefit" | "risk" | "neutral";
  onset: string | null;
  grade: Grade;
};

export type UpperLimitFact = { compoundSlug: string; amount: number; unit: MassUnit };

export type MicrobeSubstrateFact = {
  microbeSlug: string;
  compoundSlug: string;
  relationship: "ferments" | "promoted-by" | "inhibited-by";
  grade: Grade;
};

export type MicrobeMetaboliteFact = {
  microbeSlug: string;
  /** Null when the microbe makes it whatever it ferments. */
  substrateCompoundSlug: string | null;
  productCompoundSlug: string;
  grade: Grade;
};

export type SupplementCompoundFact = { compoundSlug: string; amountPerServing: number | null; unit: MassUnit | null };

export type StackItemInput =
  | { kind: "recipe"; slug: string; servings: number; perServing: CompoundTotal[] }
  | { kind: "supplement"; slug: string; servings: number; compounds: SupplementCompoundFact[] };

export type Facts = {
  amounts: AmountFact[];
  prepEffects: PrepEffectFact[];
  modifiers: ModifierFact[];
  cautions: CautionFact[];
  compoundEffects: CompoundEffectFact[];
  upperLimits: UpperLimitFact[];
  microbeSubstrates: MicrobeSubstrateFact[];
  microbeMetabolites: MicrobeMetaboliteFact[];
};

/** One ingredient's share of one compound, after expand and prep. */
export type Contribution = {
  recipeIngredientId: string;
  ingredientSlug: string;
  compoundSlug: string;
  amount: number | null;
  unit: MassUnit | null;
  range: [number, number] | null;
  /** One note per prep method applied, in order; empty when nothing changed the food. */
  prep: PrepNote[];
};

/** How one prep method changed one contribution, or that no source says. */
export type PrepNote = {
  ingredientSlug: string;
  compoundSlug: string;
  method: string;
  retentionFactor: number | null;
  direction: PrepDirection | null;
  note: string | null;
};

/** The part of a total that presence, caution, effect and excess checks read. */
export type AmountOf = { compoundSlug: string; amount: number | null; unit: MassUnit | null };

export type CompoundTotal = {
  compoundSlug: string;
  /** Per serving; null when no ingredient's amount is known. */
  amount: number | null;
  unit: MassUnit | null;
  range: [number, number] | null;
  contributors: { ingredientSlug: string; amount: number | null }[];
  /** Ingredients that carry the compound with no measured amount: the total leaves them out. */
  missingFrom: string[];
};

export type AbsorptionFlag = {
  compoundSlug: string;
  status: "enhanced" | "reduced" | "missed" | "unknown";
  reason: string;
  suggestion?: string;
  /** The best grade among the rules behind the flag that share its basis. */
  grade: Grade;
  /** Measured when any rule behind the flag measured this compound. */
  basis: Basis;
  ruleIds: string[];
};

export type CautionFlag = {
  kind: string;
  summary: string;
  /** Null for an excess warning, which comes from the compound's upper limit, not a graded claim. */
  grade: Grade | null;
  compoundSlug: string | null;
  ingredientSlug: string | null;
  /** What to do about a drug interaction; never that the combination is fine. */
  advice?: string;
};

export type EffectRollup = {
  effectSlug: string;
  direction: "benefit" | "risk" | "neutral";
  bestGrade: Grade;
  compounds: string[];
  onset: string | null;
};

export type GoalScore = {
  score: number;
  /** Compounds behind the goal that could not be scored: no amount, or no reference amount set. */
  unscored: string[];
};

export type FeedFlag = {
  microbeSlug: string;
  /** Measured grams of what feeds it × evidence weight; unmeasured feeds add nothing. */
  score: number;
  feeds: { compoundSlug: string; grams: number | null }[];
  metabolites: string[];
  heldBackBy: string[];
};

export type StackTotal = {
  compoundSlug: string;
  amount: number | null;
  unit: MassUnit | null;
  contributors: { itemSlug: string; amount: number | null }[];
  missingFrom: string[];
};

export type ExcessCheck = {
  compoundSlug: string;
  amount: number;
  unit: MassUnit;
  upperLimit: { amount: number; unit: MassUnit } | null;
  status: "over" | "within" | "no upper limit on file";
};

export type RecipeProfile = {
  perServing: CompoundTotal[];
  prep: PrepNote[];
  absorption: AbsorptionFlag[];
  effects: EffectRollup[];
  cautions: CautionFlag[];
  goalScores: Record<string, GoalScore>;
  /** Microbes the recipe would feed, if the person has them. */
  feeds: FeedFlag[];
};
