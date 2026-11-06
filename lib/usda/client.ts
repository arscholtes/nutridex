import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FdcFood } from "./nutrients.ts";

export const FDC_API = "https://api.nal.usda.gov/fdc/v1";

const PULL_BATCH = 20;
const PULL_WORKERS = 3;
const PULL_ATTEMPTS = 5;
const PULL_TIMEOUT_MS = 60_000;
const PULL_RETRY_MS = 5_000;

/**
 * Fetch one food's full record from USDA FoodData Central.
 * @param fdcId [number] the FoodData Central id
 * @param apiKey [string] an api.data.gov key, sent as a header rather than in the URL
 * @return [Promise<FdcFood>] the food record
 * @throws when USDA cannot be reached or answers with anything but 200
 */
export async function fetchFood(fdcId: number, apiKey: string): Promise<FdcFood> {
  let res: Response;
  try {
    res = await fetch(`${FDC_API}/food/${fdcId}`, { headers: { "X-Api-Key": apiKey } });
  } catch (err) {
    const code = (err as { cause?: { code?: string } }).cause?.code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      throw new Error(`cannot resolve api.nal.usda.gov (${code}): this network's DNS is not answering for it`, {
        cause: err,
      });
    }
    throw err;
  }
  if (!res.ok) {
    throw new Error(`USDA FoodData Central answered HTTP ${res.status} for fdcId ${fdcId}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as FdcFood;
}

/** @return [string] the API address of one food's record, used as its source url */
export const foodUrl = (fdcId: number) => `${FDC_API}/food/${fdcId}`;

/**
 * @param food [FdcFood] a food's record
 * @return [object] the source row naming that record
 */
export function usdaSource(food: FdcFood): { title: string; url: string; studyType: string; year: number | null } {
  const year = food.publicationDate?.match(/(\d{4})$/)?.[1];
  return {
    title: `USDA FoodData Central: ${food.description} (${food.dataType}, fdcId ${food.fdcId})`,
    url: foodUrl(food.fdcId),
    studyType: "database",
    year: year ? Number(year) : null,
  };
}

/**
 * Every food in one of USDA's datasets.
 * @param dataType [string] such as "SR Legacy"
 * @param apiKey [string] an api.data.gov key
 * @return [Promise<number[]>] its fdcIds, lowest first
 * @throws when USDA answers with anything but 200
 */
export async function listFoodIds(dataType: string, apiKey: string): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ dataType, pageSize: "200", pageNumber: String(page) });
    const rows = (await askUsda(`${FDC_API}/foods/list?${params}`, { headers: { "X-Api-Key": apiKey } }, sleep)) as { fdcId: number }[];
    ids.push(...rows.map((r) => r.fdcId));
    if (rows.length < 200) return ids.sort((a, b) => a - b);
  }
}

/**
 * Many foods' records, read from a folder where they are held and fetched from USDA where they are not,
 * so a stopped pull resumes and a re-run costs no calls.
 * @param fdcIds [number[]] the foods
 * @param apiKey [string] an api.data.gov key, sent as a header rather than in the URL
 * @param folder [string] where records are held
 * @param options [{ pause }] how to wait before trying again
 * @return [Promise<Map<number, FdcFood>>] every food, by fdcId
 * @throws when USDA refuses, keeps failing, or leaves out a food it was asked for
 */
export async function pullFoods(
  fdcIds: number[],
  apiKey: string,
  folder: string,
  { pause = sleep }: { pause?: (ms: number) => Promise<void> } = {},
): Promise<Map<number, FdcFood>> {
  mkdirSync(folder, { recursive: true });
  const held = (id: number) => join(folder, `${id}.json`);
  const missing = fdcIds.filter((id) => !existsSync(held(id)));
  const batches: number[][] = [];
  for (let i = 0; i < missing.length; i += PULL_BATCH) batches.push(missing.slice(i, i + PULL_BATCH));

  const worker = async () => {
    for (let batch = batches.shift(); batch; batch = batches.shift()) {
      const foods = (await askUsda(
        `${FDC_API}/foods`,
        { method: "POST", headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ fdcIds: batch, format: "full" }) },
        pause,
      )) as FdcFood[];
      for (const food of foods) {
        writeFileSync(`${held(food.fdcId)}.tmp`, JSON.stringify(whatTheDexReads(food)));
        renameSync(`${held(food.fdcId)}.tmp`, held(food.fdcId));
      }
      const left = batch.filter((id) => !foods.some((f) => f.fdcId === id));
      if (left.length > 0) throw new Error(`USDA left out fdcIds ${left.join(", ")}`);
    }
  };
  try {
    await Promise.all(Array.from({ length: PULL_WORKERS }, worker));
  } finally {
    batches.length = 0;
  }
  return new Map(fdcIds.map((id) => [id, JSON.parse(readFileSync(held(id), "utf8")) as FdcFood]));
}

function whatTheDexReads(food: FdcFood): FdcFood {
  const { fdcId, description, dataType, publicationDate, foodCategory, foodPortions, foodNutrients } = food;
  return { fdcId, description, dataType, publicationDate, foodCategory, foodPortions, foodNutrients: foodNutrients.filter((n) => n.amount !== undefined) };
}

// USDA blocks a key for an hour once it passes its rate limit (https://fdc.nal.usda.gov/api-guide/),
// so only a passing fault is worth trying again.
async function askUsda(url: string, init: RequestInit, pause: (ms: number) => Promise<void>): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    let failure: Error;
    let passing = true;
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(PULL_TIMEOUT_MS) });
      if (res.ok) return await res.json();
      failure = new Error(`USDA FoodData Central answered HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      passing = res.status >= 500;
    } catch (err) {
      if (!(err instanceof Error) || (err.name !== "TimeoutError" && err.name !== "TypeError")) throw err;
      failure = err;
    }
    if (!passing || attempt === PULL_ATTEMPTS) throw failure;
    await pause(attempt * PULL_RETRY_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}
