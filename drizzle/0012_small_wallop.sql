CREATE TABLE "catch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"caught_at" timestamp with time zone NOT NULL,
	"form" text,
	"recipe_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catch_encounter_caught_at" UNIQUE("encounter_id","caught_at"),
	CONSTRAINT "catch_form_known" CHECK (form in ('raw', 'juiced', 'cooked'))
);
--> statement-breakpoint
ALTER TABLE "catch" ADD CONSTRAINT "catch_encounter_id_encounter_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catch" ADD CONSTRAINT "catch_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "catch" ("encounter_id", "caught_at", "uploaded_at") SELECT "id", "encountered_at", "uploaded_at" FROM "encounter";
