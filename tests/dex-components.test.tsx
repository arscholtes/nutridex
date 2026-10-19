// The Dex's shared pieces, rendered without a database.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { BasisFrame } from "../components/basis-frame.tsx";
import { GradeBadge } from "../components/grade-badge.tsx";

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
