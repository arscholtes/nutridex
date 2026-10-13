import type { FdcFood } from "./nutrients.ts";

export const FDC_API = "https://api.nal.usda.gov/fdc/v1";

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
