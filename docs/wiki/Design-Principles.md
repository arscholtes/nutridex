# Design principles

_Last updated 2026-11-13. Source: the [design canvas](https://claude.ai/code/artifact/ab065fd4-9113-4368-b970-3f623da00a00)._

These hold on every platform and every skin. They come from the app's own rules (CLAUDE.md and the design system's content guide) and from decisions made while designing.

## Honesty

- Every claim carries its source and an A–D evidence grade, in the regulator's own words. Never paraphrase a claim into something stronger.
- Missing stays missing: when USDA has no figure the screen says so, never zero or an estimate.
- Never a dose, never a supplement. Health beyond food points to a clinician.
- Cautions are never locked behind a tier.
- Figures are the same on every device and at every tier; tiers only decide which sections draw.

## The collection

- On iPhone and iPad nothing unseen shows: no name, list, link or count gives a hidden entry away. Seen entries (searched, or in a recipe you opened) show as violet silhouettes with their name.
- On the web and Mac the whole wall stands, blacked out until caught: a locked card shows its number and shape only.
- Insights and recipe ideas only ever name foods you have caught.

## Visual system (game UI)

- Dark-native. Ground `#0f1115`, panels `#1b1f27`, text `#f4f1ea`, secondary `#b9b4a8`.
- Thick black outlines (3px inset) and hard drop shadows (`0 5px 0 #000`) on every panel, button and card.
- LCD readouts: `#0d1f17` panels with VT323 numbers in `#a8f0c0`, for counts, scores and labels.
- Primary action yellow `#ffd23f` with ink `#1a1400`; caught/done teal `#4fe3d0`; seen violet `#c9b8ff`; coral `#ff7043` for cooking and alerts.
- Type: Fredoka 500–700 for interface text, VT323 for readouts. Type colours (food categories, compound classes, body systems) come from the NutriDex design system and never change with the skin.
- Creatures keep their food's true colour, 6px outlines and the shared face. Uploaded art has its background tile removed so it can sit on any ground.
- Touch targets are at least 44px. Every control is a real button, link or input. Reduced motion turns off every animation and shows end states at once.

## Navigation

- iPhone: a five-slot tab bar, Dex · Health · Catch · Party · Trainer, with Catch as a raised yellow button in the centre. Map moves to a toggle at the top of the Dex once Health takes its slot.
- iPad: the same five as a left rail.
- Web and Mac: the Lab, with tabs for the Lab, research desk, health report, scan review, letters and party planner.
