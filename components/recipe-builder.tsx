"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveRecipeAction } from "../app/actions.ts";
import type { RecipeDraft } from "../lib/db/recipes.ts";
import { encodeDraft } from "../lib/recipe-draft.ts";

type Food = { slug: string; name: string };
const field = "rounded-md border border-line bg-transparent px-2 py-1 text-sm";

/**
 * The recipe builder. Every change goes into the URL a moment later, and the server redraws the
 * preview beneath from it, so the profile updates live without the engine ever leaving the server.
 */
export function RecipeBuilder({ foods, prepMethods, initial, canSave }: { foods: Food[]; prepMethods: string[]; initial: RecipeDraft; canSave: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => startTransition(() => router.replace(`/recipes/new?d=${encodeDraft(draft)}`, { scroll: false })), 350);
    return () => clearTimeout(timer);
  }, [draft, router]);

  const nameOf = (slug: string) => foods.find((f) => f.slug === slug)?.name ?? slug;
  const update = (change: (d: RecipeDraft) => RecipeDraft) => setDraft((d) => change(structuredClone(d)));

  if (foods.length === 0) {
    return <p className="dex-panel p-3 text-sm">The builder offers only foods you have found. Mark something you had on the home screen first.</p>;
  }

  async function save() {
    const result = await saveRecipeAction(draft);
    if ("slug" in result) router.push(`/recipes/${result.slug}`);
    else setProblems(result.problems);
  }

  return (
    <section className="dex-panel space-y-4 p-3" aria-label="Recipe builder">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Name
          <input className={field} value={draft.name} placeholder="Carrot and kale with oil" onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} />
        </label>
        <label className="flex w-28 flex-col gap-1 text-sm">
          Servings
          <input className={field} type="number" min={1} value={draft.servings} onChange={(e) => update((d) => ({ ...d, servings: Number(e.target.value) }))} />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="font-bold">Ingredients</legend>
        {draft.ingredients.map((ing, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select className={field} aria-label={`Ingredient ${i + 1}`} value={ing.food} onChange={(e) => update((d) => { d.ingredients[i].food = e.target.value; return d; })}>
              {foods.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
            </select>
            <input className={`${field} w-24`} type="number" min={1} aria-label={`Grams of ingredient ${i + 1}`} value={ing.grams} onChange={(e) => update((d) => { d.ingredients[i].grams = Number(e.target.value); return d; })} />
            <span className="text-sm text-ink-soft">g</span>
            <select className={field} aria-label={`Prep for ingredient ${i + 1}`} value={ing.prepMethod} onChange={(e) => update((d) => { d.ingredients[i].prepMethod = e.target.value; return d; })}>
              {prepMethods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button type="button" className="text-sm underline" onClick={() => update((d) => {
              d.ingredients.splice(i, 1);
              d.steps.forEach((s) => { s.uses = s.uses.filter((u) => u !== i).map((u) => (u > i ? u - 1 : u)); });
              return d;
            })}>Remove</button>
          </div>
        ))}
        <button type="button" className="rounded-md border border-line px-3 py-1 text-sm font-bold" onClick={() => update((d) => {
          const unused = foods.find((f) => !d.ingredients.some((x) => x.food === f.slug)) ?? foods[0];
          d.ingredients.push({ food: unused.slug, grams: 100, prepMethod: "raw" });
          return d;
        })}>Add an ingredient</button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-bold">Steps</legend>
        {draft.steps.map((step, s) => (
          <div key={s} className="space-y-2 rounded-md border border-line p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">{s + 1}.</span>
              <input className={`${field} flex-1`} aria-label={`Step ${s + 1} title`} placeholder="Steam the vegetables" value={step.title} onChange={(e) => update((d) => { d.steps[s].title = e.target.value; return d; })} />
              <select className={field} aria-label={`Step ${s + 1} prep`} value={step.prepMethod ?? ""} onChange={(e) => update((d) => { d.steps[s].prepMethod = e.target.value || null; return d; })}>
                <option value="">no prep change</option>
                {prepMethods.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button type="button" className="text-sm underline" onClick={() => update((d) => { d.steps.splice(s, 1); return d; })}>Remove</button>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {draft.ingredients.map((ing, i) => (
                <label key={i} className="flex items-center gap-1">
                  <input type="checkbox" checked={step.uses.includes(i)} onChange={(e) => update((d) => {
                    d.steps[s].uses = e.target.checked ? [...d.steps[s].uses, i].sort((a, b) => a - b) : d.steps[s].uses.filter((u) => u !== i);
                    return d;
                  })} />
                  {nameOf(ing.food)}
                </label>
              ))}
              {draft.ingredients.length === 0 && <span className="text-ink-soft">Add ingredients, then choose which this step uses. A step using none acts on the whole recipe.</span>}
            </div>
          </div>
        ))}
        <button type="button" className="rounded-md border border-line px-3 py-1 text-sm font-bold" onClick={() => update((d) => {
          d.steps.push({ title: "", prepMethod: null, uses: d.ingredients.map((_, i) => i) });
          return d;
        })}>Add a step</button>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="rounded-md bg-ink px-4 py-2 text-sm font-bold text-card disabled:opacity-50" disabled={!canSave || draft.ingredients.length === 0} onClick={save}>
          Save recipe
        </button>
        {!canSave && <span className="text-sm text-ink-soft">Saving needs the passcode, the same as Upload. Everything else works without it.</span>}
        {pending && <span className="text-sm text-ink-soft" role="status">Updating the profile…</span>}
      </div>
      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-danger" role="alert">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </section>
  );
}
