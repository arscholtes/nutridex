# NutriDex design wiki

_Last updated 2026-11-13. Source: the [design canvas](https://claude.ai/code/artifact/ab065fd4-9113-4368-b970-3f623da00a00)._

This wiki is the hand-off for NutriDex's redesign: every screen, how it should behave, and the reasons behind it, so that what gets built matches what was designed. The screens live on a [Design canvas](https://claude.ai/code/artifact/ab065fd4-9113-4368-b970-3f623da00a00); each page here mirrors one of its pages, with a screenshot and the build note that sits beside each artboard.

NutriDex is phone-first and built as a game, Pokédex-style: you catch the foods you eat, research them to open more of their entries, cook parties (recipes), and a chef rat professor guides you. Everything stays honest: every claim has a source and a grade, missing stays missing, and nothing hidden leaks.

## Pages

- [[Design principles|Design-Principles]]: the rules every screen keeps, and the visual system
- [[Game systems|Game-Systems]]: the loop, research tiers, ranks and badges
- [[The professor|The-Professor]]: the guide character
- [[iPhone|iPhone]]: the main app, screen by screen
- [[iPad|iPad]]: the same game with more room
- [[Web and Mac: the Lab|Web-and-Mac]]: research, planning and the full wall
- [[Health|Health]]: label scanning, the health score and nutrient detail
- [[NutriDex Plus|Plus]]: the paid tier, pricing and how Claude is used
- [[Explorations|Explorations]]: the journey map and the three directions that came before the game
- [[Design changelog|Design-Changelog]]: what changed and why

## Keeping it current

Design changes happen in the Claude conversation that owns the canvas; each change updates the canvas and these pages together. The pages are built from the canvas (titles, build notes, screenshots), so the canvas is the single source of truth. They live in `docs/wiki/` in the repository, and the `wiki-sync` workflow copies them to the GitHub wiki whenever they change on `main`.
