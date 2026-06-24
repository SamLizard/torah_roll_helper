# Torah Roll Helper

Frontend app for **Gabbaim** and **Ba'alei Kriah** to quickly calculate how many Torah columns/pages to roll, and in which direction.

Live site: https://samlizard.github.io/torah_roll_helper/

The app accepts either:
- a **photo** (Dicta OCR + parallels)
- a **first-line search** (typed text or in-browser OCR)
- a **manual reference** (book/chapter/verse)
- a **manual page number**
- a **reading target** selected from upcoming dates or the full list

Then it computes:
- `pages = abs(toPage - fromPage)`
- `direction = forward | backward`

## What This Project Is

This is a **Vue 3 + TypeScript frontend-only PWA**.

- No backend
- No user accounts
- No server-side state
- Installable on mobile and desktop through the browser
- Local app data is bundled as JSON; network services are used only for integrations

Main goal: reduce time spent rolling a Sefer Torah in real synagogue use.

## Core Model (Important)

Everything is normalized to a **page number**.

- Selectable Torah layouts: **245 pages** (`klaf_245`, default), **226 pages** (`klaf_226`), and **248 pages** (`klaf_248`)
- The **248-page** layout was re-enabled after verification with the rabbi4u source; known source discrepancies remain documented in the layout notes and GitHub issue tracker.
- Source data maps Torah references and reading targets to page numbers per layout
- UI always ends with `fromPage` and `toPage`

This keeps the rolling logic simple and deterministic while allowing different klaf layouts to share the same workflow.

## Key Features

- Two-sided workflow: **FROM** (current location) and **TO** (target location)
- Multiple input modes on each side:
  - photo capture/upload via Dicta
  - first-line search by typed Hebrew text
  - first-line image OCR with Tesseract.js in the browser
  - manual verse input
  - manual page input
  - selection from target list
- Calendar-aware suggestions:
  - recent readings for FROM
  - upcoming readings for TO
  - Israel / Gola mode support
  - paired parashot handling (for example `vayakhel::pekudei`)
- Full target browser:
  - searchable
  - grouped by parashot / holidays
  - grouped by Torah book / holiday group
- Result panel:
  - direction and page count
  - from/to page recap
  - extra remaining-in-destination-book hint when crossing books
  - share action for native share, copy link, WhatsApp, or email
- Tikkun links:
  - provider setting with Auto, tikkun.io, and Sefaria options
  - Auto prefers reading-specific tikkun.io links when available
  - falls back to layout-independent Sefaria reference links when needed
  - warns when a selected provider is tied to a different klaf layout
- Saved settings:
  - language, Israel/Gola mode, nusach, Torah layout, and tikkun provider are persisted locally
  - a temporary banner shows active non-default saved settings on load
- Progressive Web App support:
  - install guide / browser install prompt support
  - service worker caching for app shell and local data
  - offline-ready and update-available reload prompts
- i18n + RTL:
  - English, Hebrew, French
  - RTL-aware arrows, dialogs, share UI, and metadata
- Responsive camera UX:
  - desktop and mobile capture flows
  - file upload fallback when camera is unavailable
- First-visit onboarding:
  - quick-start tutorial prompt
  - guided tutorial state saved locally

## Current Data Snapshot

- `src/data/target_pages.json`: **114** entries
  - 54 parashot
  - 60 holiday/special readings
- `src/data/226/`: **5 books**, **226 pages**
- `src/data/245/`: **5 books**, **245 pages**
- `src/data/248/`: **5 books**, **248 pages** (verified and selectable)
- Each layout folder contains:
  - `real_db.json` - Torah reference to page data
  - `page_first_lines.json` - first-line data for page lookup and OCR matching
  - `page_titles_keys.json` - generated page-title translation keys

## External Integrations

- **Dicta OCR API**: `https://segmentserver.dicta.org.il/ocr/`
- **Dicta Parallels API**: `https://parallels-2-1.loadbalancer.dicta.org.il/parallels/api`
- **Hebcal leyning/hdate** packages for reading calendar generation
- **tikkun.io** and **Sefaria** for external tikkun/reference links
- **Web Share API** when the browser supports native sharing

Notes:
- Dicta responses can return multiple possible matches; the app asks the user to choose.
- If only chapter is detected (no verse), the app expands to approximate page candidates.
- First-line OCR uses Tesseract.js in the browser and matches against local layout data.
- Offline mode can use cached app/data, but Dicta, external tikkun links, and first-time asset downloads still depend on the network.

## Project Structure

```text
src/
  components/              # UI components (selectors, dialogs, camera, result cards)
  composables/             # business logic (page resolution, roll math, Dicta, OCR, calendar)
  composables/calendar/    # monthly reading generation + paired-parasha handling
  composables/tikkunProviders/ # provider adapters for tikkun.io, Sefaria, and future providers
  data/
    226/                   # 226-page layout data
    245/                   # 245-page layout data (default)
    248/                   # 248-page layout data
    target_pages.json      # reading targets with per-layout page maps
  locales/                 # i18n messages (en/he/fr)
  plugins/                 # vuetify + i18n setup
  scripts/                 # data-generation utilities used by npm scripts
  stores/                  # Pinia state (options + monthly readings)
  views/                   # routed pages (Home, About, How To)
  router/                  # vue-router config

docs/contributing/         # step-by-step contributor guides
tests/                     # Vitest coverage for data, search, links, and roll logic
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
- `npm run serve` - alias for the dev server
- `npm run host` - start dev server on the host network
- `npm run build` - type-check + production build
- `npm run build-only` - production build only
- `npm run type-check` - run `vue-tsc`
- `npm run lint` - eslint (with `--fix`)
- `npm run test` - run Vitest
- `npm run generate-layout-data -- --layout <n>` - verify a layout's data, generate its `page_titles_keys.json`, and fill `target_pages.json` (see the add-a-layout guide)
- `npm run deploy` - publish `dist/` to GitHub Pages via `gh-pages`

## Deployment Notes

- Vite `base` is configured as: `/torah_roll_helper/`
- Router uses **hash history** for static hosting compatibility
- PWA manifest icons, shortcuts, and service worker caching are configured in `vite.config.ts`
- Deploy script expects GitHub Pages workflow with `dist/` output

## Limitations (Current)

- No backend account sync; saved settings are local to the browser/device.
- Only one nusach option currently available (`sefaradic`).
- A physical scroll may follow a slightly different source/tradition than the selected layout; when in doubt, spot-check the page starts against that scroll.
- Dicta OCR/parallels, external tikkun links, and browser camera capture depend on the user's network and device capabilities.

## Tests

Vitest is configured. Current test coverage includes:

- `tests/rollResultUtils.test.ts` - roll direction and page-count math
- `tests/firstLineSearch.test.ts` - first-line matching and layout-specific search behavior
- `tests/firstLineOcr.test.ts` - OCR text normalization, correction, and ranking helpers
- `tests/generateLayoutData.test.ts` - layout data validation and generated output checks
- `tests/tikkunLinks.test.ts` - tikkun provider URL resolution and warning behavior
- `tests/targetPagesReferences.test.ts` - reading target reference/data integrity

Run all tests with:

```bash
npm run test
```

## Project Status

Active development. Feature set is usable, with ongoing improvements to UX, data verification, install/offline behavior, and option expansion.

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

### 2) Add or verify a scroll layout option

Full guide: **[docs/contributing/add-a-torah-layout.md](docs/contributing/add-a-torah-layout.md)**.

In short: create or verify `src/data/<pageCount>/` with `real_db.json` and
`page_first_lines.json`, then run
`npm run generate-layout-data -- --layout <pageCount>`, which verifies them,
generates `page_titles_keys.json`, and fills in `src/data/target_pages.json`.
Finally register the layout in `src/composables/torahData.ts` and
`TORAH_TYPE_OPTIONS` (`src/stores/options.ts`) and add the locale label.

The 248-page layout is a useful reference for this workflow: it was verified
against the rabbi4u source and is now enabled, while its recorded discrepancies
remain important documentation of source differences.

### 3) Add a new nusach option

1. Add a new nusach id in `NUSACH_OPTIONS` in `src/stores/options.ts`.
2. Add translated labels for this id under `settings.nusachOptions` in all locale files in `src/locales/`.
3. Update `src/data/target_pages.json` for this nusach, including all sheni/hamishi ends for all readings (currently represented by `refEndPartial`).
4. Make sure selection of nusach uses the correct target data in the UI.

### 4) Add links to other online tikkun providers

Use [`docs/contributing/add-a-tikkun-provider.md`](docs/contributing/add-a-tikkun-provider.md).

Providers live in `src/composables/tikkunProviders/`, one provider per file. The
app uses Auto by default: it tries provider-specific reading links first, then
reference links, and warns when a layout-bound provider displays pages from a
different klaf layout.

### Bigger ideas (open an issue first)

Open-ended ideas - better OCR, other page-detection methods, saved Sifrei Torah,
calendar-driven scroll suggestions, data export/import, more rites, UI/UX redesign -
should start as a GitHub issue.

Important note:
- Codex (ChatGPT) helped with an important part of this project.
- Because of that, some code areas may be less clean than ideal and may benefit from refactoring/review.
