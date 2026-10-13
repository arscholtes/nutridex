CREATE TABLE "absorption_modifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_compound_id" uuid,
	"modifier_compound_id" uuid,
	"modifier_condition" text,
	"direction" text,
	"magnitude" text,
	"mechanism" text,
	"evidence_grade" char(1),
	"source_id" uuid,
	CONSTRAINT "absorption_modifier_evidence_grade_known" CHECK (evidence_grade in ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
CREATE TABLE "caution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id" uuid,
	"ingredient_id" uuid,
	"kind" text,
	"summary" text,
	"threshold_note" text,
	"evidence_grade" char(1),
	"source_id" uuid,
	CONSTRAINT "caution_evidence_grade_known" CHECK (evidence_grade in ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
CREATE TABLE "compound" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"class" text,
	"pubchem_cid" integer,
	"solubility" text,
	"heat_stability" text,
	"light_stability" text,
	"mechanism_summary" text,
	"mechanism_detail" text,
	"upper_limit_note" text,
	"upper_limit_amount" numeric,
	"upper_limit_unit" text,
	"art_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "compound_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "compound_effect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id" uuid,
	"effect_id" uuid,
	"summary" text,
	"dose_context" text,
	"onset" text,
	"evidence_grade" char(1),
	"source_id" uuid,
	CONSTRAINT "compound_effect_evidence_grade_known" CHECK (evidence_grade in ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
CREATE TABLE "effect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"body_system" text,
	"direction" text,
	CONSTRAINT "effect_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ingest_draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_input" text,
	"source_url" text,
	"proposed" jsonb,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"usda_fdc_id" integer,
	"default_unit" text DEFAULT 'g',
	"typical_serving_g" numeric,
	"cost_tier" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ingredient_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ingredient_compound" (
	"ingredient_id" uuid NOT NULL,
	"compound_id" uuid NOT NULL,
	"amount_per_100g" numeric,
	"unit" text,
	"amount_low" numeric,
	"amount_high" numeric,
	"form_note" text,
	"source_id" uuid,
	CONSTRAINT "ingredient_compound_ingredient_id_compound_id_pk" PRIMARY KEY("ingredient_id","compound_id")
);
--> statement-breakpoint
CREATE TABLE "microbe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"common_name" text,
	"rank" text,
	"ncbi_taxon_id" integer,
	"habitat" text,
	"description" text,
	"art_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "microbe_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "microbe_metabolite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"microbe_id" uuid,
	"substrate_compound_id" uuid,
	"product_compound_id" uuid,
	"evidence_grade" char(1),
	"source_id" uuid,
	CONSTRAINT "microbe_metabolite_evidence_grade_known" CHECK (evidence_grade in ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
CREATE TABLE "microbe_substrate" (
	"microbe_id" uuid NOT NULL,
	"compound_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"evidence_grade" char(1),
	"source_id" uuid,
	CONSTRAINT "microbe_substrate_microbe_id_compound_id_relationship_pk" PRIMARY KEY("microbe_id","compound_id","relationship"),
	CONSTRAINT "microbe_substrate_evidence_grade_known" CHECK (evidence_grade in ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
CREATE TABLE "prep_effect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id" uuid,
	"prep_method" text,
	"retention_factor" numeric,
	"bioavailability_note" text,
	"source_id" uuid
);
--> statement-breakpoint
CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"servings" integer DEFAULT 1,
	"notes" text,
	CONSTRAINT "recipe_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid,
	"ingredient_id" uuid,
	"grams" numeric NOT NULL,
	"prep_method" text DEFAULT 'raw',
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "recipe_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid,
	"position" integer,
	"title" text,
	"instruction" text,
	"timer_seconds" integer,
	"prep_method" text
);
--> statement-breakpoint
CREATE TABLE "recipe_step_ingredient" (
	"step_id" uuid NOT NULL,
	"recipe_ingredient_id" uuid NOT NULL,
	CONSTRAINT "recipe_step_ingredient_step_id_recipe_ingredient_id_pk" PRIMARY KEY("step_id","recipe_ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"url" text,
	"doi" text,
	"pmid" text,
	"study_type" text,
	"population" text,
	"year" integer,
	"limitations" text,
	"added_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stack_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stack_id" uuid,
	"recipe_id" uuid,
	"supplement_id" uuid,
	"servings" numeric DEFAULT 1 NOT NULL,
	CONSTRAINT "stack_item_recipe_xor_supplement" CHECK ((recipe_id is null) <> (supplement_id is null))
);
--> statement-breakpoint
CREATE TABLE "supplement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text,
	"brand" text,
	"dsld_id" integer,
	"serving_unit" text,
	"third_party_tested" text,
	"art_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "supplement_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "supplement_compound" (
	"supplement_id" uuid NOT NULL,
	"compound_id" uuid NOT NULL,
	"amount_per_serving" numeric,
	"unit" text,
	"form" text,
	"standardized_to" text,
	"source_id" uuid,
	CONSTRAINT "supplement_compound_supplement_id_compound_id_pk" PRIMARY KEY("supplement_id","compound_id")
);
--> statement-breakpoint
CREATE TABLE "supplement_microbe" (
	"supplement_id" uuid NOT NULL,
	"microbe_id" uuid NOT NULL,
	"strain" text,
	"cfu_per_serving" numeric,
	"source_id" uuid,
	CONSTRAINT "supplement_microbe_supplement_id_microbe_id_pk" PRIMARY KEY("supplement_id","microbe_id")
);
--> statement-breakpoint
ALTER TABLE "absorption_modifier" ADD CONSTRAINT "absorption_modifier_target_compound_id_compound_id_fk" FOREIGN KEY ("target_compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absorption_modifier" ADD CONSTRAINT "absorption_modifier_modifier_compound_id_compound_id_fk" FOREIGN KEY ("modifier_compound_id") REFERENCES "public"."compound"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absorption_modifier" ADD CONSTRAINT "absorption_modifier_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caution" ADD CONSTRAINT "caution_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caution" ADD CONSTRAINT "caution_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caution" ADD CONSTRAINT "caution_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compound_effect" ADD CONSTRAINT "compound_effect_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compound_effect" ADD CONSTRAINT "compound_effect_effect_id_effect_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effect"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compound_effect" ADD CONSTRAINT "compound_effect_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_compound" ADD CONSTRAINT "ingredient_compound_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_compound" ADD CONSTRAINT "ingredient_compound_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_compound" ADD CONSTRAINT "ingredient_compound_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microbe_metabolite" ADD CONSTRAINT "microbe_metabolite_microbe_id_microbe_id_fk" FOREIGN KEY ("microbe_id") REFERENCES "public"."microbe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microbe_metabolite" ADD CONSTRAINT "microbe_metabolite_substrate_compound_id_compound_id_fk" FOREIGN KEY ("substrate_compound_id") REFERENCES "public"."compound"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microbe_metabolite" ADD CONSTRAINT "microbe_metabolite_product_compound_id_compound_id_fk" FOREIGN KEY ("product_compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microbe_metabolite" ADD CONSTRAINT "microbe_metabolite_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microbe_substrate" ADD CONSTRAINT "microbe_substrate_microbe_id_microbe_id_fk" FOREIGN KEY ("microbe_id") REFERENCES "public"."microbe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microbe_substrate" ADD CONSTRAINT "microbe_substrate_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microbe_substrate" ADD CONSTRAINT "microbe_substrate_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_effect" ADD CONSTRAINT "prep_effect_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_effect" ADD CONSTRAINT "prep_effect_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_step" ADD CONSTRAINT "recipe_step_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_step_ingredient" ADD CONSTRAINT "recipe_step_ingredient_step_id_recipe_step_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."recipe_step"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_step_ingredient" ADD CONSTRAINT "recipe_step_ingredient_recipe_ingredient_fk" FOREIGN KEY ("recipe_ingredient_id") REFERENCES "public"."recipe_ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_item" ADD CONSTRAINT "stack_item_stack_id_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_item" ADD CONSTRAINT "stack_item_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_item" ADD CONSTRAINT "stack_item_supplement_id_supplement_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_compound" ADD CONSTRAINT "supplement_compound_supplement_id_supplement_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_compound" ADD CONSTRAINT "supplement_compound_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_compound" ADD CONSTRAINT "supplement_compound_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_microbe" ADD CONSTRAINT "supplement_microbe_supplement_id_supplement_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_microbe" ADD CONSTRAINT "supplement_microbe_microbe_id_microbe_id_fk" FOREIGN KEY ("microbe_id") REFERENCES "public"."microbe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_microbe" ADD CONSTRAINT "supplement_microbe_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;