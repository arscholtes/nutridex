// The Dex's shared pieces, rendered without a database.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { swipeTarget } from "../components/swipe-steps.tsx";
import { BasisFrame } from "../components/basis-frame.tsx";
import { EffectBento, EffectList } from "../components/claims.tsx";
import { DexShell } from "../components/dex-shell.tsx";
import type { EffectClaim } from "../lib/db/dex.ts";
import { GradeBadge } from "../components/grade-badge.tsx";
import { AmountBar, EntryArt } from "../components/parts.tsx";

// The claim cards import the Dex's data module, whose client needs a URL to load but connects only on a query.
vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://localhost:1/never-connected";
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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

describe("the frame around every screen", () => {
  const step = (slug: string, name: string, number: string) => ({ slug, name, number, href: `/ingredients/${slug}` });
  const middle = { number: "F006", total: 15, prev: step("cantaloupe", "Cantaloupe", "F005"), next: step("egg", "Egg", "F007") };

  test("wears the app's name, locked or not", () => {
    expect(html(<DexShell>List</DexShell>)).toContain("NutriDex");
    expect(html(<DexShell locked>Read this</DexShell>)).toContain("NutriDex");
  });

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
    expect(first).toContain('aria-label="First entry"');
    expect(first).not.toContain("/ingredients/cantaloupe");
    const last = html(<DexShell pager={{ ...middle, next: null }}>Watermelon</DexShell>);
    expect(last).toContain('aria-label="Last entry"');
    expect(last).not.toContain("/ingredients/egg");
  });

  test("reaches the skins", () => {
    expect(html(<DexShell>List</DexShell>)).toContain('href="/skins"');
  });

  test("has no device frame or D-pad, only controls big enough for a thumb", () => {
    const deck = html(<DexShell pager={middle}>Carrot</DexShell>);
    for (const gone of ["dex-dpad", "dex-plate", "dex-bezel", "dex-lens"]) expect(deck).not.toContain(gone);
    expect(deck).toContain("dex-steps");
  });

  test("has no deck on a screen that is not an entry", () => {
    expect(html(<DexShell>List</DexShell>)).not.toContain("Step through the Dex");
  });

});

describe("a skin's links", () => {
  test("carry their words as well as their icons, for a skin that shows words", () => {
    const shell = html(<DexShell skin="new-age">List</DexShell>);
    expect(shell).toContain('<span class="dex-round-label">Skins</span>');
    expect(shell).toContain('<span class="dex-round-label">Sources</span>');
  });
});

describe("the Yellow version skin", () => {
  const step = (slug: string, name: string, number: string) => ({ slug, name, number, href: `/ingredients/${slug}` });
  const middle = { number: "F006", total: 15, prev: step("cantaloupe", "Cantaloupe", "F005"), next: step("egg", "Egg", "F007") };

  test("wears the original handheld: plate, lens, lights and bezel", () => {
    const shell = html(<DexShell skin="yellow-version">Carrot</DexShell>);
    for (const part of ["dex-plate", "dex-lens", "dex-light", "dex-bezel"]) expect(shell).toContain(part);
  });

  test("steps with the D-pad, and keeps the swipe", () => {
    const deck = html(<DexShell skin="yellow-version" pager={middle}>Carrot</DexShell>);
    expect(deck).toContain("dex-dpad");
    expect(deck).toContain('aria-label="Previous: Cantaloupe"');
    expect(deck).toContain('title="Back to the list"');
  });

  test("still offers no way in while the disclaimer shows", () => {
    expect(html(<DexShell skin="yellow-version" locked>Read this</DexShell>)).not.toMatch(/href="/);
  });

  test("reaches the sources and the skins", () => {
    const shell = html(<DexShell skin="yellow-version">List</DexShell>);
    expect(shell).toContain('href="/sources"');
    expect(shell).toContain('href="/skins"');
  });
});

describe("a swipe between entries", () => {
  const prev = "/ingredients/cantaloupe";
  const next = "/ingredients/egg";

  test("to the left goes to the next entry, and to the right to the previous one", () => {
    expect(swipeTarget(-120, 10, prev, next)).toBe(next);
    expect(swipeTarget(120, 10, prev, next)).toBe(prev);
  });

  test("too short is a tap or a wobble, not a swipe", () => {
    expect(swipeTarget(-30, 0, prev, next)).toBeNull();
  });

  test("mostly up or down is someone scrolling", () => {
    expect(swipeTarget(-100, 90, prev, next)).toBeNull();
  });

  test("goes nowhere at the end of the dex", () => {
    expect(swipeTarget(-120, 0, prev, null)).toBeNull();
    expect(swipeTarget(120, 0, null, next)).toBeNull();
  });
});

describe("a creature", () => {
  const compound = { slug: "vitamin-c", name: "Vitamin C", class: "vitamin" };
  const decoded = (node: React.ReactNode) => decodeURIComponent(html(node));

  test("sits on its tile by default", () => {
    expect(decoded(<EntryArt compound={compound} size={80} />)).toContain('width="240"');
  });

  test("can stand on a card with no tile behind it", () => {
    const cut = decoded(<EntryArt compound={compound} size={80} cutout />);
    expect(cut).toContain("<title");
    expect(cut).not.toContain('width="240"');
  });
});

describe("what a compound does", () => {
  const source = { id: "eu", title: "The regulation", url: "https://example.org/reg", year: 2012, studyType: "regulatory review", limitations: null };
  const claim = (effect: string, compound: string, summary: string, over: Partial<EffectClaim> = {}): EffectClaim => ({
    effect: { slug: effect, name: effect.toUpperCase(), direction: "benefit", bodySystem: null },
    compound: { slug: compound, name: compound.toUpperCase(), class: null },
    summary,
    doseContext: "A food qualifies at 12 mg per 100 g or more.",
    onset: null,
    minFoodPer100g: 12,
    grade: "B",
    source,
    ...over,
  });
  const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

  test("a source behind many claims is cited once, with the bar they share", () => {
    const list = html(<EffectList on="compound" claims={[claim("immune", "c", "Immunity."), claim("bones", "c", "Bones.")]} />);
    expect(count(list, "The regulation")).toBe(1);
    expect(count(list, "A food qualifies at 12 mg")).toBe(1);
    expect(list).toContain("Immunity.");
    expect(list).toContain("Bones.");
  });

  test("different sources are each cited", () => {
    const other = { ...source, id: "study", title: "A small trial" };
    const list = html(<EffectList on="compound" claims={[claim("immune", "c", "Immunity."), claim("skin", "c", "Skin.", { source: other })]} />);
    expect(list).toContain("The regulation");
    expect(list).toContain("A small trial");
  });

  test("a claim's own dose and onset stay beside it", () => {
    const list = html(<EffectList on="compound" claims={[claim("skin", "c", "Skin.", { doseContext: "30 mg a day", onset: "25 to 42 days", minFoodPer100g: null })]} />);
    expect(list).toContain("30 mg a day");
    expect(list).toContain("25 to 42 days");
  });

  test("never calls a food's bar a dose", () => {
    const bars = [claim("immune", "c", "Immunity."), claim("immune", "z", "Also.", { doseContext: "A food qualifies at 1.5 mg per 100 g or more." })];
    const list = html(<EffectList on="effect" claims={bars} />);
    expect(list).toContain("A food qualifies at 12 mg");
    expect(list).toContain("A food qualifies at 1.5 mg");
    expect(list).not.toContain(">Dose<");
  });

  test("names the effect on a compound's page and the compound on an effect's page", () => {
    const row = [claim("immune", "c", "Immunity.")];
    expect(html(<EffectList on="compound" claims={row} />)).toContain('href="/effects/immune"');
    expect(html(<EffectList on="effect" claims={row} />)).toContain('href="/compounds/c"');
  });

  test("marks a neutral effect, since most are benefits", () => {
    const neutral = claim("skin", "c", "Skin.", { effect: { slug: "skin", name: "SKIN", direction: "neutral", bodySystem: null } });
    expect(html(<EffectList on="compound" claims={[neutral]} />)).toContain("neutral");
    expect(html(<EffectList on="compound" claims={[claim("immune", "c", "Immunity.")]} />)).not.toContain("benefit");
  });

});

describe("the bento of what a food does", () => {
  const compound = { slug: "vitamin-c", name: "Vitamin C", class: "vitamin", dailyShare: 1.04 };
  const tile = (size: "large" | "wide" | "small", over: object = {}) => ({
    effect: { slug: "immune", name: "Immune system", direction: "benefit", bodySystem: "immune" },
    size,
    grade: "B" as const,
    topShare: 1.04,
    compounds: [compound],
    wording: "Vitamin C contributes to the normal function of the immune system.",
    dose: null,
    ...over,
  });

  test("every tile leads to the effect, where the wording and its source are", () => {
    for (const size of ["large", "wide", "small"] as const) expect(html(<EffectBento tiles={[tile(size)]} />)).toContain('href="/effects/immune"');
  });

  test("every tile shows the creatures of the nutrients behind it", () => {
    for (const size of ["large", "wide", "small"] as const) expect(html(<EffectBento tiles={[tile(size)]} />)).toContain("<img");
  });

  test("the more of your daily amount, the more it says", () => {
    const small = html(<EffectBento tiles={[tile("small")]} />);
    const wide = html(<EffectBento tiles={[tile("wide")]} />);
    const large = html(<EffectBento tiles={[tile("large")]} />);
    expect(small).toContain("104%");
    expect(small).not.toContain("of your daily");
    expect(wide).toContain("of your daily Vitamin C");
    expect(wide).not.toContain("contributes to the normal function");
    expect(large).toContain("of your daily Vitamin C");
    expect(large).toContain("contributes to the normal function");
  });

  test("a tile with no daily share gives no percentage", () => {
    const quiet = html(<EffectBento tiles={[tile("small", { topShare: null, compounds: [{ ...compound, dailyShare: null }] })]} />);
    expect(quiet.replace(/<[^>]*>/g, "")).not.toMatch(/\d%/);
  });

  test("marks a neutral effect, since most are benefits", () => {
    const neutral = tile("small", { effect: { slug: "skin", name: "Skin", direction: "neutral", bodySystem: "skin" } });
    expect(html(<EffectBento tiles={[neutral]} />)).toContain("neutral");
    expect(html(<EffectBento tiles={[tile("small")]} />)).not.toContain("benefit");
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
