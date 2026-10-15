DROP VIEW "public"."absorption_modifier_applied";--> statement-breakpoint
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
         and b.modifier_compound_id is not distinct from a.modifier_compound_id
         and b.modifier_condition is not distinct from a.modifier_condition
     )
);