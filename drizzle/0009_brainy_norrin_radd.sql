CREATE TABLE "intake_reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id" uuid NOT NULL,
	"sex" text NOT NULL,
	"age_low" integer NOT NULL,
	"age_high" integer,
	"rda" numeric,
	"ai" numeric,
	"ul" numeric,
	"unit" text NOT NULL,
	"ul_applies_to" text,
	"source_id" uuid,
	CONSTRAINT "intake_reference_group" UNIQUE("compound_id","sex","age_low"),
	CONSTRAINT "intake_reference_sex_known" CHECK (sex in ('male', 'female')),
	CONSTRAINT "intake_reference_has_a_value" CHECK (rda is not null or ai is not null or ul is not null)
);
--> statement-breakpoint
CREATE TABLE "portion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"amount" numeric NOT NULL,
	"description" text NOT NULL,
	"grams" numeric NOT NULL,
	"source_id" uuid,
	CONSTRAINT "portion_ingredient_seq" UNIQUE("ingredient_id","seq")
);
--> statement-breakpoint
CREATE TABLE "retention_factor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retention_code" integer NOT NULL,
	"food_group_code" integer NOT NULL,
	"description" text NOT NULL,
	"family" text NOT NULL,
	"prep_methods" text[] NOT NULL,
	"liquid_kept" boolean,
	"nutrient_number" integer NOT NULL,
	"nutrient_name" text NOT NULL,
	"compound_id" uuid,
	"factor" numeric,
	"source_id" uuid,
	CONSTRAINT "retention_factor_code_nutrient" UNIQUE("retention_code","nutrient_number")
);
--> statement-breakpoint
ALTER TABLE "ingredient" ADD COLUMN "retention_family" text;--> statement-breakpoint
ALTER TABLE "intake_reference" ADD CONSTRAINT "intake_reference_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_reference" ADD CONSTRAINT "intake_reference_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portion" ADD CONSTRAINT "portion_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portion" ADD CONSTRAINT "portion_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_factor" ADD CONSTRAINT "retention_factor_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_factor" ADD CONSTRAINT "retention_factor_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retention_factor_family" ON "retention_factor" USING btree ("family");