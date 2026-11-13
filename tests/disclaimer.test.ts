import { describe, expect, test } from "vitest";
import { needsAcceptance } from "../lib/disclaimer/gate.ts";
import { DISCLAIMER_INTRO, DISCLAIMER_SECTIONS, DISCLAIMER_TITLE, NATIVE_DISCLAIMER_SECTIONS } from "../lib/disclaimer/text.ts";

describe("needsAcceptance: shown until this app version is accepted, then gone until the next", () => {
  test("someone who has never accepted sees it", () => {
    expect(needsAcceptance(undefined, "0.1.0")).toBe(true);
  });

  test("someone who accepted this version does not", () => {
    expect(needsAcceptance("0.1.0", "0.1.0")).toBe(false);
  });

  test("an app update brings it back", () => {
    expect(needsAcceptance("0.1.0", "0.2.0")).toBe(true);
  });

  test("any version other than the current one counts as not accepted", () => {
    expect(needsAcceptance("0.2.0", "0.1.0")).toBe(true);
    expect(needsAcceptance("", "0.1.0")).toBe(true);
  });
});

describe("the disclaimer covers every topic it has to", () => {
  const headings = DISCLAIMER_SECTIONS.map((s) => s.heading.toLowerCase()).join(" | ");
  test.each([
    ["not medical advice", /not medical advice/],
    ["medications and health conditions", /medication/],
    ["supplements", /supplement/],
    ["accuracy of the data", /accura/],
    ["emergencies", /emergenc/],
    ["no warranty", /warrant/],
    ["what is stored about you", /stor/],
  ])("%s", (_topic, pattern) => {
    expect(headings).toMatch(pattern);
  });

  test("no section is empty", () => {
    expect(DISCLAIMER_SECTIONS.filter((s) => s.body.trim().length < 40)).toEqual([]);
  });

  test("names the app as NutriDex throughout", () => {
    expect(DISCLAIMER_TITLE).toBe("Before you use NutriDex");
    const words = [DISCLAIMER_INTRO, ...DISCLAIMER_SECTIONS.map((s) => s.body)].join(" ");
    expect(words).toContain("NutriDex");
    expect(words).not.toContain("Foodi Dex");
  });
});

describe("what the disclaimer says is stored", () => {
  const stored = (sections: { heading: string; body: string }[]) => sections.find((s) => s.heading === "What is stored about you")!.body;

  test("says the skin you choose is stored too, on the web and in the apps", () => {
    expect(stored(DISCLAIMER_SECTIONS)).toMatch(/skin/);
    expect(stored(NATIVE_DISCLAIMER_SECTIONS)).toMatch(/skin/);
  });

  test("names the foods you mark and where they go, on every platform", () => {
    for (const sections of [DISCLAIMER_SECTIONS, NATIVE_DISCLAIMER_SECTIONS]) expect(stored(sections)).toContain("foods you mark");
    expect(stored(DISCLAIMER_SECTIONS)).toContain("sign in");
    expect(stored(NATIVE_DISCLAIMER_SECTIONS)).toContain("upload");
  });

  test("the web says what signing in through Google or Apple hands over", () => {
    expect(stored(DISCLAIMER_SECTIONS)).toMatch(/Google or Apple.*name and picture/);
  });

  test("the web says an account stores your email address, and that you can take it out or delete it", () => {
    expect(stored(DISCLAIMER_SECTIONS)).toContain("email address");
    expect(stored(DISCLAIMER_SECTIONS)).toMatch(/Recipes you save.*shown to nobody else/);
    expect(stored(DISCLAIMER_SECTIONS)).toMatch(/download .* or delete/);
  });

  test("the web mentions its cookies and the apps do not", () => {
    expect(stored(DISCLAIMER_SECTIONS)).toContain("cookie");
    expect(stored(NATIVE_DISCLAIMER_SECTIONS)).not.toContain("cookie");
  });
});
