// The Dex's shared pieces, rendered without a database.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { BasisFrame } from "../components/basis-frame.tsx";
import { DexShell } from "../components/dex-shell.tsx";
import { GradeBadge } from "../components/grade-badge.tsx";
import { AmountBar } from "../components/parts.tsx";

const html = (node: React.ReactNode) => renderToStaticMarkup(node);

describe("a claim's basis", () => {
  const measured = html(<BasisFrame basis="measured" className={null}>Fat helps</BasisFrame>);
  const byClass = html(<BasisFrame basis="by-class" className="carotene">Fat helps</BasisFrame>);

  test("says in words which it is, so the difference never rests on colour alone", () => {
    expect(measured).toContain(">Measured<");
    expect(byClass).toContain("By class: carotene");
    expect(byClass).not.toContain(">Measured<");
  });

  test("draws a by-class claim with a dashed, striped frame and a measured one with a solid frame", () => {
    expect(byClass).toMatch(/class="[^"]*border-dashed/);
    expect(byClass).toMatch(/class="[^"]*repeating-linear-gradient/);
    expect(measured).toMatch(/class="[^"]*border-solid/);
    expect(measured).not.toMatch(/border-dashed|repeating-linear-gradient/);
  });

  test("explains what by-class means on hover", () => {
    expect(byClass).toContain("title=\"Its source measured other members of ChEBI&#x27;s carotene class, not this compound\"");
  });
});

describe("the handheld", () => {
  const step = (slug: string, name: string, number: string) => ({ slug, name, number, href: `/ingredients/${slug}` });
  const middle = { number: "F006", total: 15, prev: step("cantaloupe", "Cantaloupe", "F005"), next: step("egg", "Egg", "F007") };

  test("offers no way into the Dex while the disclaimer is showing", () => {
    const locked = html(<DexShell locked>Read this</DexShell>);
    expect(locked).toContain("Read this");
    expect(locked).not.toMatch(/href="/);
  });

  test("reaches the list and the sources otherwise", () => {
    const open = html(<DexShell>List</DexShell>);
    expect(open).toContain('href="/"');
    expect(open).toContain('href="/sources"');
  });

  test("steps to the entries either side and back to the list", () => {
    const deck = html(<DexShell pager={middle}>Carrot</DexShell>);
    expect(deck).toContain('aria-label="Previous: Cantaloupe"');
    expect(deck).toContain('href="/ingredients/cantaloupe"');
    expect(deck).toContain('aria-label="Next: Egg"');
    expect(deck).toContain('href="/ingredients/egg"');
    expect(deck).toContain('title="Back to the list"');
  });

  test("says so at either end of the dex rather than linking nowhere", () => {
    const first = html(<DexShell pager={{ ...middle, prev: null }}>Beet</DexShell>);
    expect(first).toContain("First entry");
    expect(first).not.toContain("/ingredients/cantaloupe");
    const last = html(<DexShell pager={{ ...middle, next: null }}>Watermelon</DexShell>);
    expect(last).toContain("Last entry");
    expect(last).not.toContain("/ingredients/egg");
  });

  test("has no deck on a screen that is not an entry", () => {
    expect(html(<DexShell>List</DexShell>)).not.toContain("Step through the Dex");
  });

  test("sets its lens to the colour it is given", () => {
    expect(html(<DexShell lens="#43B05C">Carrot</DexShell>)).toContain("--lens:#43B05C");
  });
});

describe("a stat bar", () => {
  test("is empty at exactly zero, so none never looks like a little", () => {
    expect(html(<AmountBar share={0} color="#000000" label="" />)).toContain("width:0%");
  });

  test("keeps a sliver for a tiny amount, so a little never looks like none", () => {
    expect(html(<AmountBar share={0.001} color="#000000" label="" />)).toContain("width:2%");
  });
});

describe("an evidence grade badge", () => {
  test.each([
    ["A", "emerald"],
    ["B", "sky"],
    ["C", "amber"],
    ["D", "neutral"],
  ] as const)("grade %s is %s, as the plan's grading table colours it", (grade, colour) => {
    expect(html(<GradeBadge grade={grade} limitations={null} />)).toMatch(new RegExp(`class="[^"]*bg-${colour}-`));
  });

  test("shows the source's limitations on hover", () => {
    expect(html(<GradeBadge grade="B" limitations="Small (5 per group); men only" />)).toContain('title="Grade B · Small (5 per group); men only"');
  });
});
