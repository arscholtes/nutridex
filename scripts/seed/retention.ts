// Seeds USDA's Table of Nutrient Retention Factors, Release 6 (2007), whole: one source row, then every
// row of the table, upserted on its code and nutrient. The 24 rows whose published factor cell is blank
// are stored with a null factor, never filled in, so the table on record is the table USDA published.
import { readFileSync } from "node:fs";
import { eq, sql as raw } from "drizzle-orm";
import { retentionFactor, source } from "../../lib/db/schema.ts";
import { parseRetentionTable } from "../../lib/usda/retention.ts";
import type { Tx } from "./tx.ts";

/** Where the published table sits in the repo. */
export const RETENTION_TABLE = "data/usda/retention-factors-r6.csv";

const CHUNK = 1_000;

/** USDA's nutrient numbers that name a Dex compound; 318 (vitamin A in IU) names none. */
export const NUTRIENT_COMPOUNDS: Record<number, string> = {
  301: "calcium",
  303: "iron",
  304: "magnesium",
  305: "phosphorus",
  306: "potassium",
  307: "sodium",
  309: "zinc",
  312: "copper",
  321: "beta-carotene",
  322: "alpha-carotene",
  334: "beta-cryptoxanthin",
  337: "lycopene",
  338: "lutein-zeaxanthin",
  392: "vitamin-a",
  401: "vitamin-c",
  404: "thiamin",
  405: "riboflavin",
  406: "niacin",
  415: "vitamin-b6",
  417: "folate",
  418: "vitamin-b12",
  421: "choline",
  431: "folic-acid",
  432: "folate-food",
  221: "alcohol",
};

const SOURCE = {
  title: "USDA Table of Nutrient Retention Factors, Release 6 (2007)",
  url: "https://catalog.data.gov/dataset/usda-table-of-nutrient-retention-factors-release-6-2007",
  studyType: "database",
  year: 2007,
};

/**
 * Write every row of the table that carries a factor, with the compound it names where the Dex has one.
 * @param tx [Tx] the seed's transaction
 * @param compoundIds [Map<string, string>] compound ids by slug
 * @return [Promise<number>] rows written
 * @throws when a compound the nutrient map names is missing from compoundIds
 */
export async function seedRetentionFactors(tx: Tx, compoundIds: Map<string, string>): Promise<number> {
  for (const slug of new Set(Object.values(NUTRIENT_COMPOUNDS))) {
    if (!compoundIds.has(slug)) throw new Error(`compound ${slug} is not in the database; the retention table maps a nutrient to it`);
  }
  const rows = parseRetentionTable(readFileSync(RETENTION_TABLE, "utf8"));

  const [existing] = await tx.select({ id: source.id }).from(source).where(eq(source.url, SOURCE.url));
  const sourceId = existing
    ? (await tx.update(source).set(SOURCE).where(eq(source.id, existing.id)).returning({ id: source.id }))[0].id
    : (await tx.insert(source).values(SOURCE).returning({ id: source.id }))[0].id;

  const values = rows.map((r) => ({
      retentionCode: r.retentionCode,
      foodGroupCode: r.foodGroupCode,
      description: r.description,
      family: r.family,
      prepMethods: r.prepMethods,
      liquidKept: r.liquidKept,
      nutrientNumber: r.nutrientNumber,
      nutrientName: r.nutrientName,
      compoundId: r.nutrientNumber in NUTRIENT_COMPOUNDS ? compoundIds.get(NUTRIENT_COMPOUNDS[r.nutrientNumber])! : null,
      factor: r.factor!,
      sourceId,
    }));
  for (let i = 0; i < values.length; i += CHUNK) {
    await tx
      .insert(retentionFactor)
      .values(values.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: [retentionFactor.retentionCode, retentionFactor.nutrientNumber],
        set: {
          foodGroupCode: raw`excluded.food_group_code`,
          description: raw`excluded.description`,
          family: raw`excluded.family`,
          prepMethods: raw`excluded.prep_methods`,
          liquidKept: raw`excluded.liquid_kept`,
          nutrientName: raw`excluded.nutrient_name`,
          compoundId: raw`excluded.compound_id`,
          factor: raw`excluded.factor`,
          sourceId: raw`excluded.source_id`,
        },
      });
  }

  return values.length;
}
