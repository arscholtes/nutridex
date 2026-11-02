CREATE TABLE "encounter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"encountered_at" timestamp with time zone NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounter_ingredient_id_unique" UNIQUE("ingredient_id")
);
--> statement-breakpoint
ALTER TABLE "encounter" ADD CONSTRAINT "encounter_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;