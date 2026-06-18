# Torah Roll Assistant

Frontend app for **Gabbaim** and **Ba'alei Kriah** to quickly calculate how many Torah columns/pages to roll, and in which direction.

Live site: https://samlizard.github.io/torah_roll_helper/

The app accepts either:
- a **photo** (Dicta OCR + parallels)
- a **manual reference** (book/chapter/verse)
- a **manual page number**
- a **reading target** selected from upcoming dates or the full list

Then it computes:
- `pages = abs(toPage - fromPage)`
- `direction = forward | backward`

## What This Project Is

This is a **Vue 3 + TypeScript frontend-only tool**.

- No backend
- No user accounts
- No server-side state
- Data comes from local JSON + external APIs

Main goal: reduce time spent rolling a Sefer Torah in real synagogue use.

## Core Model (Important)

Everything is normalized to a **page number**.

- Supported page range: **1..245** (current Torah type)
- Source data maps Torah references to page numbers
- UI always ends with `fromPage` and `toPage`

This keeps the rolling logic simple and deterministic.

## Key Features

- Two-sided workflow: **FROM** (current location) and **TO** (target location)
- Multiple input modes on each side:
  - photo capture/upload via Dicta
  - manual verse input
  - manual page input
  - selection from target list
- Calendar-aware suggestions:
  - recent readings for FROM
  - upcoming readings for TO
  - Israel / Gola mode support
  - paired parashot handling (e.g. `vayakhel::pekudei`)
- Full target browser:
  - searchable
  - grouped by parashot / holidays
  - grouped by Torah book/holyday group
- Result panel:
  - direction and page count
  - from/to page recap
  - extra “remaining in destination book” hint when crossing books
- i18n + RTL:
  - English, Hebrew, French
  - RTL-aware arrows and dialogs
- Responsive camera UX:
  - desktop and mobile capture flows
  - file upload fallback when camera is unavailable

## Current Data Snapshot

- `target_pages.json`: **93** entries
  - 54 parashot
  - 39 holiday/special readings
- `real_db.json`: **5 books**, **245 pages**
- `page_titles_keys.json`: **245** page-title entries

## External Integrations

- **Dicta OCR API**: `https://segmentserver.dicta.org.il/ocr/`
- **Dicta Parallels API**: `https://parallels-2-1.loadbalancer.dicta.org.il/parallels/api`
- **Hebcal leyning/hdate** packages for reading calendar generation
- Source dataset lineage includes **tikkun.io** and **Sefaria**

Notes:
- Dicta responses can return multiple possible matches; the app asks the user to choose.
- If only chapter is detected (no verse), the app expands to approximate page candidates.

## Project Structure

```text
src/
  components/           # UI components (selectors, dialogs, camera, result cards)
  composables/          # business logic (page resolution, roll math, Dicta parsing, calendar)
  composables/calendar/ # monthly reading generation + paired-parasha handling
  data/                 # local JSON datasets (targets, page titles, ref->page db)
  locales/              # i18n messages (en/he/fr)
  plugins/              # vuetify + i18n setup
  stores/               # Pinia state (options + monthly readings)
  views/                # routed pages (Home, About, How To)
  router/               # vue-router config
```

## Getting Started

### Prerequisites

- Node.js (recent LTS recommended)
- npm

### Install

```bash
npm install
```

### Run (dev)

```bash
npm run dev
```

Vite dev server runs on port **8081** by default.

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Scripts

- `npm run dev` - start dev server
- `npm run host` - start dev server on host network
- `npm run build` - type-check + production build
- `npm run build-only` - production build only
- `npm run type-check` - run `vue-tsc`
- `npm run lint` - eslint (with `--fix`)
- `npm run test` - run Vitest
- `npm run generate-layout-data -- --layout <n>` - verify a new layout's data, generate its `page_titles_keys.json`, and fill `target_pages.json` (see the add-a-layout guide)
- `npm run deploy` - publish `dist/` to GitHub Pages via `gh-pages`

## Deployment Notes

- Vite `base` is configured as: `/torah_roll_helper/`
- Router uses **hash history** for static hosting compatibility
- Deploy script expects GitHub Pages workflow with `dist/` output

## Limitations (Current)

- No persistence layer for user settings/state (except selected camera device ID)
- Only one nusach option currently available (`sefaradic`)
- Only one Torah layout currently available (`klaf_245`)
- Depends on external Dicta services and browser camera capabilities

## Tests

Vitest is configured. Current test coverage is minimal and focuses on roll-result utility logic (`tests/rollResultUtils.test.ts`).

## Project Status

Active development. Feature set is usable, with ongoing improvements to UX, camera flow, and data/option expansion.

## How To Help Develop

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide: how the project is
organized, how to pick something to work on, and our "issue vs. documentation"
rule. Detailed step-by-step guides live in [`docs/contributing/`](docs/contributing/).

The most useful contribution areas right now:

### 1) Add a language

Full guide: **[docs/contributing/add-a-language.md](docs/contributing/add-a-language.md)**.

In short: copy `src/locales/en.json` to `src/locales/<lang>.json` (keep the keys,
use a real language tag), add `public/flags/<lang>.svg`, and register the locale in
`src/plugins/i18n.ts` (plus the RTL map in `src/plugins/vuetify.ts` if needed).

### 2) Add a new scroll layout option

Full guide: **[docs/contributing/add-a-torah-layout.md](docs/contributing/add-a-torah-layout.md)**.

In short: create `src/data/<pageCount>/` with two files you write by hand —
`real_db.json` and `page_first_lines.json` — then run
`npm run generate-layout-data -- --layout <pageCount>`, which verifies them,
generates `page_titles_keys.json`, and fills in `src/data/target_pages.json`.
Finally register the layout in `src/composables/torahData.ts` and
`TORAH_TYPE_OPTIONS` (`src/stores/options.ts`) and add the locale label.

### 3) Add a new nusach option

1. Add a new nusach id in `NUSACH_OPTIONS` in `src/stores/options.ts`.
2. Add translated labels for this id under `settings.nusachOptions` in all locale files in `src/locales/`.
3. Update `src/data/target_pages.json` for this nusach, including all sheni/hamishi ends for all readings (currently represented by `refEndPartial`).
4. Make sure selection of nusach uses the correct target data in the UI.

### 4) Add links to other online tikkun providers

Use [`docs/contributing/add-a-tikkun-provider.md`](docs/contributing/add-a-tikkun-provider.md).

Providers live in `src/composables/tikkunProviders/`, one provider per file. The
app uses Auto by default: it uses tikkun.io for the 245 layout and for named
readings, then falls back to layout-free Sefaria refs on other layouts. It warns
when a layout-bound provider displays pages from a different klaf layout.

### Bigger ideas (open an issue first)

Open-ended ideas — better OCR, other page-detection methods, PWA persistence,
saved Sifrei Torah, calendar-driven scroll suggestions, data export/import, more
rites, UI/UX redesign — should start as a GitHub issue. 

Important note:
- Codex (ChatGPT) helped with an important part of this project.
- Because of that, some code areas may be less clean than ideal and may benefit from refactoring/review.
