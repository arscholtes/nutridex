CREATE TABLE "session" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "encounter" DROP CONSTRAINT "encounter_ingredient_id_unique";--> statement-breakpoint
ALTER TABLE "preference" DROP CONSTRAINT "preference_pkey";--> statement-breakpoint
ALTER TABLE "encounter" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "preference" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "encounter" ADD CONSTRAINT "encounter_owner_ingredient" UNIQUE NULLS NOT DISTINCT("owner_id","ingredient_id");--> statement-breakpoint
ALTER TABLE "preference" ADD CONSTRAINT "preference_owner_key" UNIQUE NULLS NOT DISTINCT("owner_id","key");