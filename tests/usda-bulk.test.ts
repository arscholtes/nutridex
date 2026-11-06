// Pulling thousands of USDA records, against a stand-in for USDA's API and a throwaway folder.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { listFoodIds, pullFoods } from "../lib/usda/client.ts";

const record = (fdcId: number) => ({
  fdcId,
  description: `Food ${fdcId}`,
  dataType: "SR Legacy",
  publicationDate: "4/1/2019",
  foodCategory: { description: "Snacks" },
  foodPortions: [{ gramWeight: 34 }],
  foodAttributes: ["dropped"],
  foodNutrients: [
    { nutrient: { id: 1008, name: "Energy", unitName: "kcal" }, amount: 41 },
    { nutrient: { id: 2045, name: "Proximates", unitName: "g" } },
  ],
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let folder: string;
const fetches = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const askedFor = () => fetches.mock.calls.map(([, init]) => (JSON.parse(init!.body as string) as { fdcIds: number[] }).fdcIds);

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "usda-pull-"));
  fetches.mockReset();
  fetches.mockImplementation(async (_url, init) => json((JSON.parse(init!.body as string) as { fdcIds: number[] }).fdcIds.map(record)));
  vi.stubGlobal("fetch", fetches);
});
afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(folder, { recursive: true, force: true });
});

describe("pulling foods", () => {
  test("asks for 20 at a time, so one call never carries the whole list", async () => {
    await pullFoods(Array.from({ length: 45 }, (_, i) => i + 1), "key", folder);
    expect(askedFor().map((ids) => ids.length).sort((a, b) => b - a)).toEqual([20, 20, 5]);
  });

  test("sends the key in a header, never in the URL", async () => {
    await pullFoods([1], "secret", folder);
    const [url, init] = fetches.mock.calls[0];
    expect(url).not.toContain("secret");
    expect((init!.headers as Record<string, string>)["X-Api-Key"]).toBe("secret");
  });

  test("returns every food, keeping only what the Dex reads", async () => {
    const foods = await pullFoods([7], "key", folder);
    expect(foods.get(7)).toEqual({
      fdcId: 7,
      description: "Food 7",
      dataType: "SR Legacy",
      publicationDate: "4/1/2019",
      foodCategory: { description: "Snacks" },
      foodPortions: [{ gramWeight: 34 }],
      foodNutrients: [{ nutrient: { id: 1008, name: "Energy", unitName: "kcal" }, amount: 41 }],
    });
  });

  test("calls USDA only for foods the folder lacks", async () => {
    writeFileSync(join(folder, "1.json"), JSON.stringify(record(1)));
    const foods = await pullFoods([1, 2], "key", folder);
    expect(askedFor()).toEqual([[2]]);
    expect([...foods.keys()].sort()).toEqual([1, 2]);
  });

  test("keeps what finished when USDA fails, so the next run picks up from there", async () => {
    fetches.mockImplementationOnce(async (_url, init) => json((JSON.parse(init!.body as string) as { fdcIds: number[] }).fdcIds.map(record)));
    fetches.mockImplementation(async () => json({ error: "no" }, 400));
    await expect(pullFoods(Array.from({ length: 80 }, (_, i) => i + 1), "key", folder)).rejects.toThrow(/HTTP 400/);
    expect(readdirSync(folder).length).toBeGreaterThanOrEqual(20);
  });

  test("stops at once on a rate limit, because USDA blocks the key for an hour and retrying cannot help", async () => {
    fetches.mockImplementation(async () => json({ error: "slow down" }, 429));
    await expect(pullFoods([1], "key", folder, { pause: async () => {} })).rejects.toThrow(/HTTP 429/);
    expect(fetches).toHaveBeenCalledTimes(1);
  });

  test("tries again when USDA has a passing fault", async () => {
    const pause = vi.fn(async () => {});
    fetches.mockImplementationOnce(async () => json({ error: "bad gateway" }, 502));
    const foods = await pullFoods([1], "key", folder, { pause });
    expect(pause).toHaveBeenCalledOnce();
    expect(foods.has(1)).toBe(true);
  });

  test("gives up on a fault that does not pass, and says so", async () => {
    fetches.mockImplementation(async () => json({ error: "bad gateway" }, 502));
    await expect(pullFoods([1], "key", folder, { pause: async () => {} })).rejects.toThrow(/HTTP 502/);
  });

  test("refuses an answer missing a food it asked for", async () => {
    fetches.mockImplementation(async () => json([record(1)]));
    await expect(pullFoods([1, 2], "key", folder)).rejects.toThrow(/2/);
    expect(JSON.parse(readFileSync(join(folder, "1.json"), "utf8")).fdcId).toBe(1);
  });
});

describe("listing a dataset's foods", () => {
  test("reads every page, in fdcId order", async () => {
    fetches.mockImplementation(async (url) => {
      const page = Number(new URL(url).searchParams.get("pageNumber"));
      return json(page === 1 ? Array.from({ length: 200 }, (_, i) => ({ fdcId: 1000 - i })) : [{ fdcId: 5 }]);
    });
    const ids = await listFoodIds("SR Legacy", "key");
    expect(ids).toHaveLength(201);
    expect(ids[0]).toBe(5);
    expect(new URL(fetches.mock.calls[0][0]).searchParams.get("dataType")).toBe("SR Legacy");
  });
});
