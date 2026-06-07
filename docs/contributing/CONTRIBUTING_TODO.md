# Contributing — TODO (maintainer)

Things **the maintainer plans to do** to make contributions easier. This is a
working scratchpad, not contributor-facing instructions. Move items into the real
guides / scripts as they get done, then delete them from here.

## Tooling / scripts to add (to ease "add a Torah layout")

- [ ] **Generate `page_titles_keys.json`** from `real_db.json` +
  `page_first_lines.json` (and cross-check against `src/data/target_pages.json`).
  Goal: a contributor adding a layout shouldn't hand-write the per-page parasha
  keys. Output one entry per page (length must equal the page count).
- [ ] **Update `target_pages.json` page maps for a new layout** — script that, given
  a new layout's `real_db.json`, fills the `"<pageCount>"` key on every
  `ref` / `refEndPartial` / `refEnd` `page` object. (Today this is manual and
  error-prone.)
- [ ] **Validate `real_db.json` ↔ `page_first_lines.json` correspondence** — check
  that both describe the same number of pages, that page numbering is continuous,
  and that the first line recorded for each page lines up with the verse that
  `real_db.json` says starts that page. Report mismatches.
- [ ] **Generalize `list-questionable-reference-pages`** to take a layout argument
  instead of the hardcoded `LAYOUT_KEY = '245'`
  (`scripts/list-questionable-reference-pages.ts`).

### Then: document the scripts

- [ ] Add an npm script for each (mirroring `list-questionable-reference-pages`).
- [ ] In `docs/contributing/add-a-torah-layout.md`, explain for each script:
  **what it does, when to run it, and how to interpret/act on the output** —
  especially `list-questionable-reference-pages` (what a "needs review" line means
  and how to verify against a real scroll / tikkun.io / Sefaria).

## Design decision to revisit: tikkun providers per layout

Link coverage to an online tikkun can depend on the **layout** — a provider's page
images may only correspond to one specific klaf. Options to weigh:

- A global **default provider**, and when the active layout has its own better-matching
  provider, use that by default; offer the layout-agnostic provider(s) in a select.
- OR let the user pick the provider in **Settings** (simplest, but ignores layout fit).
- OR per-layout default + user override.

Decide before generalizing `toRefUrl` / `toTikkunUrl` (`src/composables/tikkunLinks.ts`)
and the `tikkunUrl` computed in `src/components/LocationSelector.vue`. Keep
`tikkun.io` as the fallback default. **Re-think this later.**

## Process

- [ ] Whenever I say "I'll do X" for contributor tooling/docs, add it here as a task.
- [ ] After finishing, fold it into the proper guide/script and remove it from this file.
