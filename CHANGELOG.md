# Changelog

What changed in NutriDex, newest first, in words for people who use it. NutriDex has not had a public
release yet, so each date is the day that version was built.

**Keeping this up to date:** add a line under `## Unreleased` with every change someone can see. When you
bump the version in `package.json`, rename that section to `## <version> - <date>`. `npm test` fails if the
running version has no entry here.

## Unreleased

### Added

- Every food in USDA's SR Legacy database is its own entry on the web, 7,793 in all, so dried bananas and raw
  bananas are separate things to find.
- The iPhone, iPad and Mac apps can hold every one of those foods. They open each entry only when you look at it.

### Changed

- Search on iPhone, iPad and Mac ranks results the same way the website does.

### Fixed

- On iPhone and iPad running iOS 27, opening any entry but the first showed the first, and Next or the keyboard
  did not move at all, while the entry's number said you were where you asked to be.

## 0.5.0 - 2026-11-02

### Added

- Ten skins to choose from: New age, Iridescent, Yellow version, Nutrition label, Field guide, Seed packet,
  Sticker book, Deep sea, Receipt and Arcade. They work on the web, iPhone, iPad and Mac.
- Your skin follows you between devices that share an upload passcode.
- A food's page opens with what it does, as tiles sized by how much of the daily reference value 100 g supplies.
- Swipe sideways to move between entries on a touch screen.

### Changed

- New age, a clean white look, is now the default.
- "What did you have?" sits at the bottom of the screen, under your thumb.

## 0.4.0 - 2026-11-02

### Added

- NutriDex is now a collection game. Nothing shows until you have encountered it: say what you had, upload it,
  and watch it unlock.
- Native iPhone and iPad apps, built in SwiftUI.
- A Mac app, the home database. It shows everything, blacks out what you have not unlocked, plays new arrivals
  and compares foods side by side.
- Vitamins and minerals say what they do, in the wording EU regulation allows.

## 0.3.0 - 2026-11-01

### Added

- Every entry has a number, neighbours you can step through, and a share of each stat.
- A handheld look for the Dex.

### Changed

- The app is now called NutriDex. It was Foodi Dex.

## 0.2.0 - 2026-10-29

### Added

- The Dex: home, food, compound, effect and sources screens, with search that forgives misspellings
  ("tumeric" finds turmeric).
- The engine that works out what a recipe gives you: compounds per serving, how prep changes them, what helps
  or blocks absorption, cautions, effects, goal scores and which gut microbes it would feed. It has no screen yet.
- One sourced finding can reach a whole chemical class, and every flag says whether it was measured or
  reached by class.
- 456 creature drawings.
- A 30-nutrient panel on each food's page, with USDA's gaps shown as missing.
- A disclaimer that appears before anything else, and again after each update.

### Security

- Next.js 16.4.3, which patches two critical remote-code-execution flaws.

## 0.1.0 - 2026-10-12

### Added

- The foundation: database schema, local Postgres, seed data and USDA import.
