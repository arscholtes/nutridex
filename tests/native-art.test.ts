// Which creature image a card wears in the native apps.
import { describe, expect, test } from "vitest";
import { creatureArtName } from "../lib/native/art.ts";

describe("the creature image a card wears", () => {
  test("is named after the drawing, so foods that share one share one image", () => {
    const dried = creatureArtName({ kind: "ingredient", slug: "bananas-dehydrated", imageUrl: "/art/ingredients/banana.svg" });
    const raw = creatureArtName({ kind: "ingredient", slug: "bananas-raw", imageUrl: "/art/ingredients/banana.svg" });
    expect(dried).toBe("food-banana");
    expect(raw).toBe(dried);
  });

  test("names a category stand-in apart from a drawing of the same name", () => {
    expect(creatureArtName({ kind: "ingredient", slug: "beef-stew", imageUrl: "/art/stand-ins/meat.svg" })).toBe("standin-meat");
  });

  test("is drawn for each compound from its data", () => {
    expect(creatureArtName({ kind: "compound", slug: "vitamin-c", imageUrl: null })).toBe("compound-vitamin-c");
  });

  test("is none for an effect, which has no creature", () => {
    expect(creatureArtName({ kind: "effect", slug: "vision", imageUrl: null })).toBeNull();
  });

  test("stops loudly on a food with no drawing, rather than bundling nothing", () => {
    expect(() => creatureArtName({ kind: "ingredient", slug: "mystery", imageUrl: null })).toThrow(/mystery/);
  });
});
