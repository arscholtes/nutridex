"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { cookedRecipe } from "../app/actions.ts";
import type { CookFood } from "../lib/cook-along.ts";
import type { RecipeGrid } from "../lib/recipe-grid.ts";
import { NotHadMark, RecipeGridTable, type GridFood } from "./recipe-grid-table.tsx";
import { swipeTarget } from "./swipe-steps.tsx";

export type StageView = {
  step: number | null;
  title: string | null;
  prepMethod: string | null;
  foods: CookFood[];
  prep: { food: string; compound: string; method: string; keeps: number | null; note: string | null }[];
};

type Props = {
  slug: string;
  name: string;
  servings: number;
  grid: RecipeGrid;
  stepTitles: Record<number, string>;
  foods: Record<string, GridFood>;
  stages: StageView[];
  signedIn: boolean;
  /** The recipe's cautions and absorption notes, shown before the first stage. */
  children: ReactNode;
};

/** @return [string] a stage's heading: its step's title, or what to do with the one food it prepares */
function headingOf(stage: StageView, foods: Record<string, GridFood>): string {
  if (stage.title) return stage.title;
  const food = stage.foods[0];
  return food.prepMethod === "raw" ? `Add the ${foods[food.slug].name.toLowerCase()}` : `${foods[food.slug].name}: ${food.prepMethod}`;
}

/** What a stage does to what is in the food: the changes a source measures or describes, then how many no source gives an amount for. */
function StageChanges({ prep }: { prep: StageView["prep"] }) {
  const sourced = prep.filter((p) => p.keeps !== null || p.note !== null);
  const unsourced = prep.length - sourced.length;
  if (prep.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-ink-soft">What this does</h2>
      {sourced.map((p) => (
        <p key={`${p.food}:${p.compound}:${p.method}`} className="text-sm">
          <span className="font-medium">{p.food}</span>, {p.method}: {p.compound} {p.keeps === null ? "changes by an amount no source gives" : `keeps ${Math.round(p.keeps * 100)}%`}
          {p.note && <span className="block text-ink-soft">{p.note}</span>}
        </p>
      ))}
      {unsourced > 0 && (
        <p className="text-sm text-ink-soft">
          {sourced.length > 0 ? `${unsourced} more ` : `${unsourced} `}
          {unsourced === 1 ? "compound changes" : "compounds change"} by an amount no source gives. The recipe's page lists {unsourced === 1 ? "it" : "them"}.
        </p>
      )}
    </div>
  );
}

/**
 * A recipe one stage at a time: what to gather, each step with what it does to what is in the food, then a place
 * to say it was cooked. Arrow keys, the buttons and a sideways swipe all move between stages.
 */
export function CookAlong({ slug, name, servings, grid, stepTitles, foods, stages, signedIn, children }: Props) {
  // Place 0 is gathering, 1..stages.length are the stages, and the last is saying it was cooked.
  const last = stages.length + 1;
  const [place, setPlace] = useState(0);
  const [result, cooked, sending] = useActionState(() => cookedRecipe(slug), null);
  const heading = useRef<HTMLHeadingElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const go = (to: number) => {
    moved.current = true;
    setPlace(Math.max(0, Math.min(last, to)));
  };

  // Moving puts focus on the new heading, so a screen reader says where you are and the page does not jump.
  useEffect(() => {
    if (moved.current) heading.current?.focus({ preventScroll: false });
  }, [place]);

  // The arrow keys move between stages wherever focus is, since a cook's hands are rarely on the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]"))) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      moved.current = true;
      setPlace((p) => Math.max(0, Math.min(last, p + (e.key === "ArrowRight" ? 1 : -1))));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  const stage = place >= 1 && place <= stages.length ? stages[place - 1] : null;
  const notHad = Object.values(foods).filter((f) => !f.had);

  return (
    <main
      className="mx-auto max-w-2xl space-y-4 p-3 sm:p-5"
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const target = swipeTarget(e.changedTouches[0].clientX - touch.current.x, e.changedTouches[0].clientY - touch.current.y, String(place - 1), String(place + 1));
        touch.current = null;
        if (target !== null) go(Number(target));
      }}
    >
      <header className="space-y-2">
        <p className="text-sm text-ink-soft">
          <Link href={`/recipes/${slug}`} className="underline underline-offset-4">
            {name}
          </Link>{" "}
          · cooking along
        </p>
        <ol className="flex gap-1.5" aria-label={`Stage ${place + 1} of ${last + 1}`}>
          {Array.from({ length: last + 1 }, (_, i) => (
            <li key={i} className={`cook-pip h-2 flex-1 rounded-full ${i <= place ? "bg-accent" : "bg-line"}`} />
          ))}
        </ol>
      </header>

      <section key={place} className="cook-stage dex-panel space-y-4 p-4" aria-live="polite">
        {place === 0 && (
          <>
            <h1 ref={heading} tabIndex={-1} className="cook-heading text-2xl font-bold text-ink">
              Before you start
            </h1>
            <p className="text-sm text-ink-soft">{servings === 1 ? "Makes 1 serving." : `Makes ${servings} servings.`} Gather these.</p>
            <ul className="space-y-2">
              {grid.rows.map((r) => (
                <li key={r.recipeIngredientId} className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span className="font-bold text-ink">
                    {foods[r.ingredientSlug].name}
                    {!foods[r.ingredientSlug].had && <NotHadMark />}
                  </span>
                  <span className="tabular-nums text-ink-soft">{r.grams} g</span>
                </li>
              ))}
            </ul>
            {children}
          </>
        )}

        {stage && (
          <>
            <p className="text-sm font-bold text-ink-soft">
              {stage.step === null ? `Ingredient ${place} of ${stages.length}` : `Step ${stage.step} of ${stages.length}`}
              {stage.title && stage.prepMethod ? ` · ${stage.prepMethod}` : ""}
            </p>
            <h1 ref={heading} tabIndex={-1} className="cook-heading text-2xl font-bold text-ink">
              {headingOf(stage, foods)}
            </h1>
            <ul className="space-y-1">
              {stage.foods.map((f, i) => (
                <li key={`${f.slug}:${i}`} className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-ink">
                    {foods[f.slug].name}
                    {!foods[f.slug].had && <NotHadMark />}
                  </span>
                  <span className="tabular-nums text-ink-soft">{f.grams} g</span>
                </li>
              ))}
            </ul>
            <StageChanges prep={stage.prep} />
            {grid.steps.length > 0 && <RecipeGridTable grid={grid} stepTitles={stepTitles} foods={foods} lit={stage.step} />}
          </>
        )}

        {place === last && (
          <>
            <h1 ref={heading} tabIndex={-1} className="cook-heading text-2xl font-bold text-ink">
              {result?.kept ? "Counted" : "Did you cook it?"}
            </h1>
            {result?.kept === "account" && <p className="text-sm">Each food in it has one more catch on your record, in this recipe.</p>}
            {result?.kept === "browser" && (
              <p className="text-sm">
                This browser now holds each food in it as had.{" "}
                <Link href="/sign-in" className="font-bold underline underline-offset-4">
                  Sign in
                </Link>{" "}
                to keep them on your record, and to have it kept that you cooked this.
              </p>
            )}
            {!result?.kept && (
              <>
                <p className="text-sm text-ink-soft">
                  Saying so counts every food in it as had, in this recipe.
                  {notHad.length > 0 && ` ${notHad.length === 1 ? "One is new to you and its entry opens" : `${notHad.length} are new to you and their entries open`}.`}
                  {!signedIn && " You are not signed in, so this browser holds them until you are."}
                </p>
                <form action={cooked}>
                  <button type="submit" disabled={sending} className="dex-button min-h-11 w-full">
                    {sending ? "Counting" : "I cooked it"}
                  </button>
                </form>
                {result?.error && (
                  <p role="alert" className="text-sm font-bold text-danger">
                    {result.error}
                  </p>
                )}
              </>
            )}
            {result?.kept && (
              <Link href={`/recipes/${slug}`} className="dex-button inline-block">
                Back to the recipe
              </Link>
            )}
          </>
        )}
      </section>

      <nav className="flex gap-3" aria-label="Stages">
        <button type="button" onClick={() => go(place - 1)} disabled={place === 0} className="dex-button min-h-11 flex-1">
          Back
        </button>
        <button type="button" onClick={() => go(place + 1)} disabled={place === last} className="dex-button min-h-11 flex-1">
          {place === 0 ? "Start" : place === stages.length ? "Finish" : "Next"}
        </button>
      </nav>
    </main>
  );
}
