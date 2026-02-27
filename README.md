# Torah Roll Assistant

Frontend app for **Gabbaim** and **Ba'alei Kriah** to quickly calculate how many Torah columns/pages to roll, and in which direction.

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
