# Contributing to Torah Roll Assistant

Thanks for helping out. This tool helps **Gabbaim** and **Ba'alei Kriah** figure out
how many columns/pages to roll a Sefer Torah, and in which direction. It is a
**Vue 3 + TypeScript, frontend-only** app (no backend, no accounts, no server state).

This document explains how to pick something to work on, how the project is organized,
and where the detailed guides live.

## Quick start

```bash
npm install
npm run dev        # dev server on http://localhost:8081
npm run type-check # vue-tsc
npm run lint       # eslint --fix
npm run test       # vitest
npm run build      # type-check + production build
```

Branch from `dev`. Open pull requests against `dev`.

> ⚠️ **No LICENSE yet.** This repository currently has no license file, which
> legally makes outside contributions ambiguous. If you maintain the project,
> please add one (see the "Project governance" issue). If you want to contribute
> before then, ask the maintainer how they'd like contributions handled.

## How we decide: issue vs. documentation

We keep two kinds of "how to help" material, and it matters which one a task is:

- **Documentation (`.md` in `docs/contributing/`)** — for tasks with a clear,
  repeatable recipe ("how to add X"). These are step-by-step and don't need a
  design discussion. Examples: add a language, add a Torah layout, add a nusach.
- **GitHub issue** — for open-ended work that needs design, research, or community
  input before code, or that one person will "own". Examples: a better OCR engine,
  a new way to detect the open page, a redesign, a data-portability strategy.

If you're not sure, open an issue and ask. Turning a recurring question into a
new guide under `docs/contributing/` is itself a welcome contribution.

## Good first contributions (recipes — see the guides)

| Area | Difficulty | Guide |
| --- | --- | --- |
| Add a language / translation | easy | [docs/contributing/add-a-language.md](docs/contributing/add-a-language.md) |
| Fix or improve a translation | easy | [docs/contributing/add-a-language.md](docs/contributing/add-a-language.md) |
| Add a Torah scroll layout (page count) | medium–hard | [docs/contributing/add-a-torah-layout.md](docs/contributing/add-a-torah-layout.md) |
| Add a nusach option | medium | README "Add a new nusach option" |
| Add another online tikkun provider | medium | README "Add links to other online tikkun providers" |
| Correct reading/page data | medium | Use the **Data correction** issue template |

## Bigger ideas (open an issue first)

These need discussion before code. Use the **Feature request** issue template:

- A better / on-device OCR pipeline (replace or augment Dicta)
- Other ways to recognize the page the scroll is currently open on
- PWA persistent-use ideas
- "My Sifrei Torah" — let users save scrolls (text + image + layout) and reuse them
- Auto-suggest which scroll to use, based on the calendar and user rules
- Data portability — export / import / device-to-device share (stay server-less?)
- Rites/minhagim research — what differs between rites so we can add more
- UI/UX redesign proposal

## Project layout

```text
src/
  components/           # UI components (selectors, dialogs, camera, result cards)
  composables/          # business logic (page resolution, roll math, Dicta, OCR, calendar)
  composables/calendar/ # monthly reading generation + paired-parasha handling
  data/                 # local JSON datasets
    <pageCount>/        # one folder per layout: real_db, page_first_lines, page_titles_keys
    target_pages.json   # all reading targets (parashot + holidays), per-layout page maps
  locales/              # i18n messages (en / he / fr)
  plugins/              # vuetify + i18n setup
  stores/               # Pinia state (options + monthly readings)
  views/                # routed pages (Home, About, How To)
  router/               # vue-router config
```

## Coding conventions

- Keep Vue components under ~200–300 lines. If a component grows past that, split
  it into a child component **in its own file** rather than inlining a new one.
- Run `npm run lint` and `npm run type-check` before opening a PR.
- Match the existing style (composables for logic, Pinia for state, vue-i18n keys
  for every user-facing string — no hardcoded text).

## Where data comes from

- **Dicta OCR API** and **Dicta Parallels API** for photo input.
- **Hebcal** (`@hebcal/leyning`, `@hebcal/hdate`) for the reading calendar.
- Dataset lineage includes **tikkun.io** and **Sefaria**.

See [docs/contributing/add-a-torah-layout.md](docs/contributing/add-a-torah-layout.md)
for an explanation of the JSON data model (`real_db.json`, `page_first_lines.json`,
`page_titles_keys.json`, and `target_pages.json`).
