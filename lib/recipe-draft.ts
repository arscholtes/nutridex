// A recipe being built travels in the builder's URL, so the page can draw its live preview on the server.
// Plain data only: this module is safe in the browser.
import type { RecipeDraft } from "./db/recipes.ts";

export const EMPTY_DRAFT: RecipeDraft = { name: "", servings: 1, ingredients: [], steps: [] };

/** @return [string] the draft as a URL value */
export function encodeDraft(draft: RecipeDraft): string {
  return encodeURIComponent(JSON.stringify(draft));
}

/**
 * Read a draft back from the builder's URL.
 * @param value [string | undefined] the `d` search parameter, already decoded by the router
 * @return [{ draft: RecipeDraft } | { error: string }] the draft, or why the link could not be read
 */
export function parseDraft(value: string | undefined): { draft: RecipeDraft } | { error: string } {
  if (value === undefined || value === "") return { draft: EMPTY_DRAFT };
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return { error: "This link's recipe could not be read; start again below." };
  }
  return isDraft(raw) ? { draft: raw } : { error: "This link's recipe is not one the builder made; start again below." };
}

/** @return [RecipeDraft | null] the value as a draft, or null when it does not have a draft's shape */
export const asDraft = (value: unknown): RecipeDraft | null => (isDraft(value) ? value : null);

function isDraft(v: unknown): v is RecipeDraft {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Record<string, unknown>;
  return typeof d.name === "string" && typeof d.servings === "number"
    && Array.isArray(d.ingredients) && d.ingredients.every((i) => typeof i === "object" && i !== null
      && typeof i.food === "string" && typeof i.grams === "number" && typeof i.prepMethod === "string")
    && Array.isArray(d.steps) && d.steps.every((s) => typeof s === "object" && s !== null
      && typeof s.title === "string" && (s.prepMethod === null || typeof s.prepMethod === "string")
      && Array.isArray(s.uses) && s.uses.every((u: unknown) => typeof u === "number"));
}
