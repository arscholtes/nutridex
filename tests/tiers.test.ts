// Research tiers and trainer ranks are rules over what someone has done, worked out and never stored.
import { describe, expect, test } from "vitest";
import { rankOf, tierOf, tierProgress, type FoodHistory } from "../lib/tiers.ts";

const had = (over: Partial<FoodHistory>): FoodHistory => ({ catches: 0, forms: 0, cooked: 0, recipes: 0, sourcesOpened: 0, ...over });

describe("a food's tier", () => {
  test("is nothing until it is caught, and one star from the first catch", () => {
    expect(tierOf(had({}))).toBe(0);
    expect(tierOf(had({ catches: 1, forms: 1 }))).toBe(1);
  });

  test("reaches two stars by having it three times, or by cooking it once", () => {
    expect(tierOf(had({ catches: 2 }))).toBe(1);
    expect(tierOf(had({ catches: 3 }))).toBe(2);
    expect(tierOf(had({ catches: 1, cooked: 1, recipes: 1 }))).toBe(2);
  });

  test("reaches three stars with two sources opened and two forms, and not with one of the two", () => {
    expect(tierOf(had({ catches: 3, sourcesOpened: 2, forms: 1 }))).toBe(2);
    expect(tierOf(had({ catches: 3, sourcesOpened: 1, forms: 2 }))).toBe(2);
    expect(tierOf(had({ catches: 3, sourcesOpened: 2, forms: 2 }))).toBe(3);
  });

  test("reaches four stars at ten times in three recipes", () => {
    expect(tierOf(had({ catches: 10, cooked: 3, recipes: 2, sourcesOpened: 2, forms: 2 }))).toBe(3);
    expect(tierOf(had({ catches: 10, cooked: 3, recipes: 3, sourcesOpened: 2, forms: 2 }))).toBe(4);
  });

  test("never skips a tier: ten catches in three recipes without the research is still two stars", () => {
    expect(tierOf(had({ catches: 10, cooked: 3, recipes: 3 }))).toBe(2);
  });
});

describe("progress to the next tier", () => {
  test("lists each task of the next tier with how far along it is, capped at what it needs", () => {
    expect(tierProgress(had({ catches: 4, cooked: 1, recipes: 1, sourcesOpened: 1, forms: 1 }))).toEqual({
      tier: 2,
      next: { stars: 3, name: "Studied", tasks: [{ task: "sourcesOpened", have: 1, need: 2 }, { task: "forms", have: 1, need: 2 }] },
    });
    expect(tierProgress(had({ catches: 12 })).next?.tasks).toEqual([{ task: "sourcesOpened", have: 0, need: 2 }, { task: "forms", have: 0, need: 2 }]);
  });

  test("has nothing next at the top", () => {
    expect(tierProgress(had({ catches: 10, cooked: 3, recipes: 3, sourcesOpened: 2, forms: 2 }))).toEqual({ tier: 4, next: null });
  });
});

describe("a trainer's rank", () => {
  test("starts at the first catch and rises with foods caught and badges", () => {
    expect(rankOf({ caught: 0, badges: 0 })).toBeNull();
    expect(rankOf({ caught: 1, badges: 0 })?.name).toBe("Kitchen hand");
    expect(rankOf({ caught: 10, badges: 0 })?.name).toBe("Line cook");
    expect(rankOf({ caught: 25, badges: 3 })?.name).toBe("Sous chef");
    expect(rankOf({ caught: 50, badges: 6 })?.name).toBe("Head chef");
  });

  test("waits for the badges as well as the count", () => {
    expect(rankOf({ caught: 60, badges: 2 })?.name).toBe("Line cook");
    expect(rankOf({ caught: 60, badges: 5 })?.name).toBe("Sous chef");
  });
});
