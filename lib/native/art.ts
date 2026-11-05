// Which creature image each card wears in the native apps.
import type { EntryKind } from "../db/dex.ts";

const DRAWING = /^\/art\/(ingredients|stand-ins)\/([a-z0-9-]+)\.svg$/;

/**
 * Names a card's image after its drawing, so foods that share a drawing share one image in the app.
 * @param card [{ kind: EntryKind; slug: string; imageUrl: string | null }] the entry's card
 * @return [string | null] the asset catalog name, or null for an effect, which has no creature
 */
export function creatureArtName(card: { kind: EntryKind; slug: string; imageUrl: string | null }): string | null {
  if (card.kind === "effect") return null;
  if (card.kind === "compound") return `compound-${card.slug}`;
  const drawn = card.imageUrl?.match(DRAWING);
  if (!drawn) throw new Error(`${card.slug} has no drawing to bundle: its image_url is ${card.imageUrl}`);
  return `${drawn[1] === "stand-ins" ? "standin" : "food"}-${drawn[2]}`;
}
