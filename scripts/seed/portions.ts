// USDA's household measures for each food, from SR Legacy's Weight file as data/seed/usda-portions.json
// holds it: "1 cup chopped" of raw carrot is 128 g. Both seeds call this with the foods they wrote.
import { readFileSync } from "node:fs";
import { eq, sql as raw } from "drizzle-orm";
import { portion, source } from "../../lib/db/schema.ts";
import type { Tx } from "./tx.ts";

const PORTIONS_FILE = new URL("../../data/seed/usda-portions.json", import.meta.url);
const CHUNK = 1_000;

const WEIGHT_FILE_SOURCE = {
  title: "USDA FoodData Central, SR Legacy: household measures (Weight file)",
  url: "https://fdc.nal.usda.gov/download-datasets.html",
  studyType: "database",
  year: 2019,
};

type UsdaPortion = { amount: number; unit: string | null; description: string; grams: number };

let portionsByFdcId: Record<string, UsdaPortion[]> | undefined;

/** @return [Record<string, UsdaPortion[]>] the Weight file keyed by fdcId, read from disk once per process */
function usdaPortions(): Record<string, UsdaPortion[]> {
  portionsByFdcId ??= JSON.parse(readFileSync(PORTIONS_FILE, "utf8")) as Record<string, UsdaPortion[]>;
  return portionsByFdcId;
}

/**
 * Upserts every household measure USDA lists for the given foods, in USDA's order.
 * @param tx [Tx] the seed's transaction
 * @param foods [{ ingredientId, usdaFdcId }[]] the foods already written, with the USDA record each stands for
 * @return [Promise<number>] how many portion rows were written
 */
export async function seedPortions(tx: Tx, foods: { ingredientId: string; usdaFdcId: number }[]): Promise<number> {
  const byFdcId = usdaPortions();
  const rows = foods.flatMap((food) =>
    (byFdcId[String(food.usdaFdcId)] ?? []).map((p, i) => ({
      ingredientId: food.ingredientId,
      seq: i + 1,
      amount: p.amount,
      description: p.description,
      grams: p.grams,
    })),
  );
  if (rows.length === 0) return 0;

  const sourceId = await weightFileSourceId(tx);
  for (let at = 0; at < rows.length; at += CHUNK) {
    await tx
      .insert(portion)
      .values(rows.slice(at, at + CHUNK).map((r) => ({ ...r, sourceId })))
      .onConflictDoUpdate({
        target: [portion.ingredientId, portion.seq],
        set: { amount: raw`excluded.amount`, description: raw`excluded.description`, grams: raw`excluded.grams`, sourceId: raw`excluded.source_id` },
      });
  }
  return rows.length;
}

/** @return [Promise<string>] the id of the Weight file's source row, written or refreshed by url */
async function weightFileSourceId(tx: Tx): Promise<string> {
  const [existing] = await tx.select({ id: source.id }).from(source).where(eq(source.url, WEIGHT_FILE_SOURCE.url));
  if (existing) {
    await tx.update(source).set(WEIGHT_FILE_SOURCE).where(eq(source.id, existing.id));
    return existing.id;
  }
  const [created] = await tx.insert(source).values(WEIGHT_FILE_SOURCE).returning({ id: source.id });
  return created.id;
}
