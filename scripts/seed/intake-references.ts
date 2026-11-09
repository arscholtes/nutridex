// Writes the adult Dietary Reference Intakes: the two Health Canada tables as source rows, then one
// intake_reference row per compound, sex and age group. Safe to re-run: sources are upserted by url
// and references by (compound, sex, age_low).
import { eq } from "drizzle-orm";
import { INTAKE_REFERENCES, INTAKE_SOURCES, type IntakeSourceKey } from "../../data/seed/intake-references.ts";
import { intakeReference, source } from "../../lib/db/schema.ts";
import type { Tx } from "./tx.ts";

/**
 * Upserts the adult intake references and the source rows they cite.
 * @param tx [Tx] the seed's transaction
 * @param compoundIds [Map<string, string>] compound slug → id, for every seeded compound
 * @return [Promise<number>] how many intake_reference rows were written
 * @throws when a reference names a compound slug the map lacks
 */
export async function seedIntakeReferences(tx: Tx, compoundIds: Map<string, string>): Promise<number> {
  const sourceIds = new Map<IntakeSourceKey, string>();
  for (const s of INTAKE_SOURCES) {
    const values = { title: s.title, url: s.url, year: s.year, studyType: s.studyType };
    const [existing] = await tx.select({ id: source.id }).from(source).where(eq(source.url, s.url));
    const id = existing
      ? (await tx.update(source).set(values).where(eq(source.id, existing.id)).returning({ id: source.id }))[0].id
      : (await tx.insert(source).values(values).returning({ id: source.id }))[0].id;
    sourceIds.set(s.key, id);
  }

  let written = 0;
  for (const r of INTAKE_REFERENCES) {
    const compoundId = compoundIds.get(r.compoundSlug);
    if (!compoundId) throw new Error(`intake reference names ${r.compoundSlug}, which is not a seeded compound`);
    const values = {
      ageHigh: r.ageHigh,
      rda: r.rda,
      ai: r.ai,
      ul: r.ul,
      unit: r.unit,
      ulAppliesTo: r.ulAppliesTo,
      sourceId: sourceIds.get(r.source)!,
    };
    await tx
      .insert(intakeReference)
      .values({ compoundId, sex: r.sex, ageLow: r.ageLow, ...values })
      .onConflictDoUpdate({ target: [intakeReference.compoundId, intakeReference.sex, intakeReference.ageLow], set: values });
    written += 1;
  }
  return written;
}
