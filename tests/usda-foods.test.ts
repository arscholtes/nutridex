// Turning USDA's descriptions into Dex foods, and the pins that come out of it.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { INGREDIENTS } from "../data/seed/ingredients.ts";
import { foodCategory, foodName, foodSlug } from "../lib/usda/foods.ts";

describe("a food's name", () => {
  test("a raw food goes by what it is", () => {
    expect(foodName("Bananas, raw")).toBe("Bananas");
  });

  test("any other form keeps the words that make it its own thing", () => {
    expect(foodName("Bananas, dehydrated, or banana powder")).toBe("Bananas, dehydrated, or banana powder");
    expect(foodName("Carrots, cooked, boiled, drained, without salt")).toBe("Carrots, cooked, boiled, drained, without salt");
  });

  test("only a trailing raw is dropped, since mid-name it tells two foods apart", () => {
    expect(foodName("Apples, raw, with skin")).toBe("Apples, raw, with skin");
  });

  test("drops USDA's note about its food distribution programme", () => {
    expect(foodName("Pumpkin, canned, without salt (Includes foods for USDA's Food Distribution Program)")).toBe("Pumpkin, canned, without salt");
  });

  test("keeps a note that says what the food is", () => {
    expect(foodName("Melon, banana (Navajo)")).toBe("Melon, banana (Navajo)");
  });
});

describe("a food's slug", () => {
  test("is the name in lower case, joined by hyphens", () => {
    expect(foodSlug("Bananas, dehydrated, or banana powder")).toBe("bananas-dehydrated-or-banana-powder");
  });

  test("folds accents and drops everything else", () => {
    expect(foodSlug("Crème fraîche (2% fat)")).toBe("creme-fraiche-2-fat");
  });
});

describe("a food's category", () => {
  test("is the Dex's short word for USDA's food group", () => {
    expect(foodCategory("Fruits and Fruit Juices")).toBe("fruit");
    expect(foodCategory("Beef Products")).toBe("meat");
  });

  test("refuses a group it does not know, rather than filing the food under nothing", () => {
    expect(() => foodCategory("Space Food")).toThrow(/Space Food/);
  });
});

describe("the pinned foods", () => {
  type Pin = { slug: string; name: string; category: string; usdaFdcId: number; usdaDescription: string; imageUrl: string };
  const pins: Pin[] = JSON.parse(readFileSync(new URL("../data/seed/usda-foods.json", import.meta.url), "utf8"));
  const all = [...INGREDIENTS.map((i) => ({ ...i, imageUrl: `/art/ingredients/${i.slug}.svg` })), ...pins];

  test("hold every food in SR Legacy exactly once", () => {
    expect(all).toHaveLength(7793);
    expect(new Set(all.map((p) => p.usdaFdcId)).size).toBe(7793);
  });

  test("give every form its own slug and its own name", () => {
    expect(new Set(all.map((p) => p.slug)).size).toBe(all.length);
    expect(new Set(all.map((p) => p.name)).size).toBe(all.length);
  });

  test("name a form by what it is, never by the food it came from", () => {
    const named = (description: string) => all.find((p) => p.usdaDescription === description)!.name;
    expect(named("Mango, dried, sweetened")).toBe("Mango, dried, sweetened");
    expect(named("Carrot, dehydrated")).toBe("Carrot, dehydrated");
  });

  test("keep bananas and dehydrated bananas apart", () => {
    const named = (name: string) => all.filter((p) => p.name === name).map((p) => p.usdaDescription);
    expect(named("Bananas")).toEqual(["Bananas, raw"]);
    expect(named("Bananas, dehydrated, or banana powder")).toEqual(["Bananas, dehydrated, or banana powder"]);
  });

  test("leave the hand-pinned foods as they are", () => {
    expect(pins.filter((p) => INGREDIENTS.some((i) => i.usdaFdcId === p.usdaFdcId))).toEqual([]);
  });

  test("point every food at art that exists", () => {
    const urls = [...new Set(all.map((p) => p.imageUrl))];
    expect(urls.filter((url) => !existsSync(new URL(`../public${url}`, import.meta.url)))).toEqual([]);
  });
});
