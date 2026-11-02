// Every table from the build plan's schema, Microbiome and Supplements sections.
// Column names match the plan's SQL exactly; SCHEMA.md describes each table.
import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow();
const amount = (name: string) => numeric(name, { mode: "number" });
// A/B/C/D, per the plan's Evidence grading table.
const evidenceGrade = () => char("evidence_grade", { length: 1 });
const gradeIsKnown = (table: string) =>
  check(`${table}_evidence_grade_known`, sql`evidence_grade in ('A', 'B', 'C', 'D')`);

// Where every claim comes from. Created first: every fact table references it.
export const source = pgTable("source", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  url: text("url"),
  doi: text("doi"),
  pmid: text("pmid"),
  studyType: text("study_type"),
  population: text("population"),
  year: integer("year"),
  limitations: text("limitations"),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

export const ingredient = pgTable("ingredient", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  usdaFdcId: integer("usda_fdc_id"),
  defaultUnit: text("default_unit").default("g"),
  typicalServingG: amount("typical_serving_g"),
  costTier: text("cost_tier"),
  imageUrl: text("image_url"),
  createdAt: createdAt(),
});

export const compound = pgTable("compound", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  class: text("class"),
  pubchemCid: integer("pubchem_cid"),
  solubility: text("solubility"),
  heatStability: text("heat_stability"),
  lightStability: text("light_stability"),
  mechanismSummary: text("mechanism_summary"),
  mechanismDetail: text("mechanism_detail"),
  upperLimitNote: text("upper_limit_note"),
  upperLimitAmount: amount("upper_limit_amount"),
  upperLimitUnit: text("upper_limit_unit"),
  artUrl: text("art_url"),
  createdAt: createdAt(),
  // The ChEBI entity; null for a combined measurement or a total, or when not looked up yet.
  chebiId: integer("chebi_id"),
});

// A ChEBI class a rule can target. Classes come from ChEBI, never invented here.
export const compoundClass = pgTable("compound_class", {
  id: uuid("id").primaryKey().defaultRandom(),
  chebiId: integer("chebi_id").unique().notNull(),
  name: text("name").notNull(),
  sourceId: uuid("source_id").references(() => source.id).notNull(),
});

// Which compounds ChEBI places under a class, as of the source's release.
export const compoundClassMember = pgTable(
  "compound_class_member",
  {
    classId: uuid("class_id").references(() => compoundClass.id, { onDelete: "cascade" }).notNull(),
    compoundId: uuid("compound_id").references(() => compound.id, { onDelete: "cascade" }).notNull(),
    sourceId: uuid("source_id").references(() => source.id).notNull(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.compoundId] })],
);

export const ingredientCompound = pgTable(
  "ingredient_compound",
  {
    ingredientId: uuid("ingredient_id").references(() => ingredient.id, { onDelete: "cascade" }).notNull(),
    compoundId: uuid("compound_id").references(() => compound.id, { onDelete: "cascade" }).notNull(),
    amountPer100g: amount("amount_per_100g"),
    unit: text("unit"),
    amountLow: amount("amount_low"),
    amountHigh: amount("amount_high"),
    formNote: text("form_note"),
    sourceId: uuid("source_id").references(() => source.id),
  },
  (t) => [primaryKey({ columns: [t.ingredientId, t.compoundId] })],
);

export const effect = pgTable("effect", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  bodySystem: text("body_system"),
  direction: text("direction"),
});

export const encounter = pgTable("encounter", {
  id: uuid("id").primaryKey().defaultRandom(),
  ingredientId: uuid("ingredient_id")
    .notNull()
    .unique()
    .references(() => ingredient.id, { onDelete: "cascade" }),
  encounteredAt: timestamp("encountered_at", { withTimezone: true }).notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const compoundEffect = pgTable(
  "compound_effect",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    compoundId: uuid("compound_id").references(() => compound.id, { onDelete: "cascade" }),
    effectId: uuid("effect_id").references(() => effect.id),
    summary: text("summary"),
    doseContext: text("dose_context"),
    onset: text("onset"),
    minFoodPer100g: amount("min_food_per_100g"),
    evidenceGrade: evidenceGrade(),
    sourceId: uuid("source_id").references(() => source.id),
  },
  () => [gradeIsKnown("compound_effect")],
);

export const absorptionModifier = pgTable(
  "absorption_modifier",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetCompoundId: uuid("target_compound_id").references(() => compound.id, { onDelete: "cascade" }),
    modifierCompoundId: uuid("modifier_compound_id").references(() => compound.id),
    modifierCondition: text("modifier_condition"),
    direction: text("direction"),
    magnitude: text("magnitude"),
    mechanism: text("mechanism"),
    evidenceGrade: evidenceGrade(),
    sourceId: uuid("source_id").references(() => source.id),
    targetClassId: uuid("target_class_id").references(() => compoundClass.id),
  },
  () => [
    gradeIsKnown("absorption_modifier"),
    check("absorption_modifier_one_target", sql`(target_compound_id is null) <> (target_class_id is null)`),
  ],
);

// For a class-targeted modifier, the class members its source measured.
export const modifierMeasuredMember = pgTable(
  "modifier_measured_member",
  {
    modifierId: uuid("modifier_id").references(() => absorptionModifier.id, { onDelete: "cascade" }).notNull(),
    compoundId: uuid("compound_id").references(() => compound.id, { onDelete: "cascade" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.modifierId, t.compoundId] })],
);

// Every modifier applied to each compound it reaches. A class rule reaches its measured members
// as `measured` and the rest of its class as `by-class`; a by-class row gives way to any measured
// row for the same compound and modifier, whichever direction it found. SCHEMA.md describes the columns.
export const absorptionModifierApplied = pgView("absorption_modifier_applied", {
  modifierId: uuid("modifier_id"),
  compoundId: uuid("compound_id"),
  basis: text("basis"),
  modifierCompoundId: uuid("modifier_compound_id"),
  modifierCondition: text("modifier_condition"),
  direction: text("direction"),
  magnitude: text("magnitude"),
  mechanism: text("mechanism"),
  evidenceGrade: char("evidence_grade", { length: 1 }),
  sourceId: uuid("source_id"),
}).as(sql`
  with applied as (
    select am.id as modifier_id, am.target_compound_id as compound_id, 'measured'::text as basis,
           am.modifier_compound_id, am.modifier_condition, am.direction, am.magnitude, am.mechanism,
           am.evidence_grade, am.source_id
    from absorption_modifier am
    where am.target_compound_id is not null
    union all
    select am.id, m.compound_id, case when mm.compound_id is null then 'by-class' else 'measured' end,
           am.modifier_compound_id, am.modifier_condition, am.direction, am.magnitude, am.mechanism,
           am.evidence_grade, am.source_id
    from absorption_modifier am
    join compound_class_member m on m.class_id = am.target_class_id
    left join modifier_measured_member mm on mm.modifier_id = am.id and mm.compound_id = m.compound_id
  )
  select a.* from applied a
  where a.basis = 'measured'
     or not exists (
       select 1 from applied b
       where b.basis = 'measured'
         and b.compound_id = a.compound_id
         and b.modifier_compound_id is not distinct from a.modifier_compound_id
         and b.modifier_condition is not distinct from a.modifier_condition
     )
`);

export const prepEffect = pgTable(
  "prep_effect",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    compoundId: uuid("compound_id").references(() => compound.id, { onDelete: "cascade" }),
    prepMethod: text("prep_method"),
    retentionFactor: amount("retention_factor"),
    bioavailabilityNote: text("bioavailability_note"),
    sourceId: uuid("source_id").references(() => source.id),
    // Which way the prep moves the compound, for sources that say so without giving a number.
    direction: text("direction"),
  },
  () => [check("prep_effect_direction_known", sql`direction in ('decreases', 'increases', 'unchanged')`)],
);

export const caution = pgTable(
  "caution",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    compoundId: uuid("compound_id").references(() => compound.id),
    ingredientId: uuid("ingredient_id").references(() => ingredient.id),
    kind: text("kind"),
    summary: text("summary"),
    thresholdNote: text("threshold_note"),
    evidenceGrade: evidenceGrade(),
    sourceId: uuid("source_id").references(() => source.id),
  },
  () => [gradeIsKnown("caution")],
);

export const recipe = pgTable("recipe", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  servings: integer("servings").default(1),
  notes: text("notes"),
});

export const recipeIngredient = pgTable("recipe_ingredient", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id").references(() => recipe.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id").references(() => ingredient.id),
  grams: amount("grams").notNull(),
  prepMethod: text("prep_method").default("raw"),
  position: integer("position"),
});

export const recipeStep = pgTable("recipe_step", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id").references(() => recipe.id, { onDelete: "cascade" }),
  position: integer("position"),
  title: text("title"),
  instruction: text("instruction"),
  timerSeconds: integer("timer_seconds"),
  prepMethod: text("prep_method"),
});

export const recipeStepIngredient = pgTable(
  "recipe_step_ingredient",
  {
    stepId: uuid("step_id").references(() => recipeStep.id, { onDelete: "cascade" }).notNull(),
    recipeIngredientId: uuid("recipe_ingredient_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.stepId, t.recipeIngredientId] }),
    // Named by hand: the generated name is 67 characters and Postgres truncates past 63.
    foreignKey({
      name: "recipe_step_ingredient_recipe_ingredient_fk",
      columns: [t.recipeIngredientId],
      foreignColumns: [recipeIngredient.id],
    }).onDelete("cascade"),
  ],
);

export const ingestDraft = pgTable("ingest_draft", {
  id: uuid("id").primaryKey().defaultRandom(),
  rawInput: text("raw_input"),
  sourceUrl: text("source_url"),
  proposed: jsonb("proposed"),
  status: text("status").default("pending"),
  createdAt: createdAt(),
});

// ── Microbiome ────────────────────────────────────────────────────────────

export const microbe = pgTable("microbe", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  commonName: text("common_name"),
  rank: text("rank"),
  ncbiTaxonId: integer("ncbi_taxon_id"),
  habitat: text("habitat"),
  description: text("description"),
  artUrl: text("art_url"),
  createdAt: createdAt(),
});

export const microbeSubstrate = pgTable(
  "microbe_substrate",
  {
    microbeId: uuid("microbe_id").references(() => microbe.id, { onDelete: "cascade" }).notNull(),
    compoundId: uuid("compound_id").references(() => compound.id, { onDelete: "cascade" }).notNull(),
    relationship: text("relationship").notNull(),
    evidenceGrade: evidenceGrade(),
    sourceId: uuid("source_id").references(() => source.id),
  },
  (t) => [
    primaryKey({ columns: [t.microbeId, t.compoundId, t.relationship] }),
    gradeIsKnown("microbe_substrate"),
  ],
);

export const microbeMetabolite = pgTable(
  "microbe_metabolite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    microbeId: uuid("microbe_id").references(() => microbe.id, { onDelete: "cascade" }),
    substrateCompoundId: uuid("substrate_compound_id").references(() => compound.id),
    productCompoundId: uuid("product_compound_id").references(() => compound.id, { onDelete: "cascade" }),
    evidenceGrade: evidenceGrade(),
    sourceId: uuid("source_id").references(() => source.id),
  },
  () => [gradeIsKnown("microbe_metabolite")],
);

// ── Supplements ───────────────────────────────────────────────────────────

export const supplement = pgTable("supplement", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  kind: text("kind"),
  brand: text("brand"),
  dsldId: integer("dsld_id"),
  servingUnit: text("serving_unit"),
  thirdPartyTested: text("third_party_tested"),
  artUrl: text("art_url"),
  createdAt: createdAt(),
});

export const supplementCompound = pgTable(
  "supplement_compound",
  {
    supplementId: uuid("supplement_id").references(() => supplement.id, { onDelete: "cascade" }).notNull(),
    compoundId: uuid("compound_id").references(() => compound.id, { onDelete: "cascade" }).notNull(),
    amountPerServing: amount("amount_per_serving"),
    unit: text("unit"),
    form: text("form"),
    standardizedTo: text("standardized_to"),
    sourceId: uuid("source_id").references(() => source.id),
  },
  (t) => [primaryKey({ columns: [t.supplementId, t.compoundId] })],
);

export const supplementMicrobe = pgTable(
  "supplement_microbe",
  {
    supplementId: uuid("supplement_id").references(() => supplement.id, { onDelete: "cascade" }).notNull(),
    microbeId: uuid("microbe_id").references(() => microbe.id, { onDelete: "cascade" }).notNull(),
    strain: text("strain"),
    cfuPerServing: amount("cfu_per_serving"),
    sourceId: uuid("source_id").references(() => source.id),
  },
  (t) => [primaryKey({ columns: [t.supplementId, t.microbeId] })],
);

export const stack = pgTable("stack", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  notes: text("notes"),
});

export const stackItem = pgTable(
  "stack_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stackId: uuid("stack_id").references(() => stack.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id").references(() => recipe.id),
    supplementId: uuid("supplement_id").references(() => supplement.id),
    servings: amount("servings").notNull().default(1),
  },
  () => [check("stack_item_recipe_xor_supplement", sql`(recipe_id is null) <> (supplement_id is null)`)],
);
