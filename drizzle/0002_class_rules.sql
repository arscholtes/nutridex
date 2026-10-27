CREATE TABLE "compound_class" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chebi_id" integer NOT NULL,
	"name" text NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "compound_class_chebi_id_unique" UNIQUE("chebi_id")
);
--> statement-breakpoint
CREATE TABLE "compound_class_member" (
	"class_id" uuid NOT NULL,
	"compound_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "compound_class_member_class_id_compound_id_pk" PRIMARY KEY("class_id","compound_id")
);
--> statement-breakpoint
CREATE TABLE "modifier_measured_member" (
	"modifier_id" uuid NOT NULL,
	"compound_id" uuid NOT NULL,
	CONSTRAINT "modifier_measured_member_modifier_id_compound_id_pk" PRIMARY KEY("modifier_id","compound_id")
);
--> statement-breakpoint
ALTER TABLE "absorption_modifier" ADD COLUMN "target_class_id" uuid;--> statement-breakpoint
ALTER TABLE "compound" ADD COLUMN "chebi_id" integer;--> statement-breakpoint
ALTER TABLE "compound_class" ADD CONSTRAINT "compound_class_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compound_class_member" ADD CONSTRAINT "compound_class_member_class_id_compound_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."compound_class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compound_class_member" ADD CONSTRAINT "compound_class_member_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compound_class_member" ADD CONSTRAINT "compound_class_member_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_measured_member" ADD CONSTRAINT "modifier_measured_member_modifier_id_absorption_modifier_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."absorption_modifier"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_measured_member" ADD CONSTRAINT "modifier_measured_member_compound_id_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compound"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absorption_modifier" ADD CONSTRAINT "absorption_modifier_target_class_id_compound_class_id_fk" FOREIGN KEY ("target_class_id") REFERENCES "public"."compound_class"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absorption_modifier" ADD CONSTRAINT "absorption_modifier_one_target" CHECK ((target_compound_id is null) <> (target_class_id is null));--> statement-breakpoint
CREATE VIEW "public"."absorption_modifier_applied" AS (
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
         and b.direction is not distinct from a.direction
         and b.modifier_compound_id is not distinct from a.modifier_compound_id
         and b.modifier_condition is not distinct from a.modifier_condition
     )
);