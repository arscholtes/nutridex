// What the database holds beyond the seed's own lists. The seed never deletes these: they may be
// another writer's, or the seed's own from before a list changed. It reports them for a person to judge.
import type { Sql } from "postgres";
import { CLASSES, MODIFIERS, SOURCES } from "../data/seed/facts.ts";

/**
 * Class members and class rules' measured members in the database that the seed's lists lack.
 * @param db [Sql] a connection or transaction
 * @return [Promise<string[]>] one readable line per extra row; empty when the database matches
 */
export async function seedDrift(db: Sql): Promise<string[]> {
  const lines: string[] = [];
  for (const k of CLASSES) {
    const rows = await db<{ slug: string }[]>`
      select c.slug from compound_class_member m
      join compound_class k on k.id = m.class_id join compound c on c.id = m.compound_id
      where k.chebi_id = ${k.chebiId} order by c.slug`;
    for (const { slug } of rows) {
      if (!k.members.includes(slug)) lines.push(`CHEBI:${k.chebiId} (${k.name}) has member ${slug}, which the seed does not list`);
    }
  }
  for (const m of MODIFIERS) {
    if (!("chebiClass" in m.target)) continue;
    const { chebiClass, measured } = m.target;
    const url = SOURCES.find((s) => s.key === m.source)!.url;
    const rows = await db<{ slug: string }[]>`
      select c.slug from modifier_measured_member mm
      join absorption_modifier am on am.id = mm.modifier_id
      join compound_class k on k.id = am.target_class_id
      join source s on s.id = am.source_id
      join compound c on c.id = mm.compound_id
      left join compound mc on mc.id = am.modifier_compound_id
      where k.chebi_id = ${chebiClass} and s.url = ${url}
        and am.modifier_condition is not distinct from ${m.condition}
        and mc.slug is not distinct from ${m.modifierCompound}
      order by c.slug`;
    for (const { slug } of rows) {
      if (!measured.includes(slug)) lines.push(`${m.source}'s rule on CHEBI:${chebiClass} lists ${slug} as measured, which the seed does not`);
    }
  }
  return lines;
}
