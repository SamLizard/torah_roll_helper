# Issue drafts (ready to post)

You don't have the `gh` CLI installed, so these are written to paste into GitHub
manually: **Issues → New issue → "Feature request / idea"** (or blank), then copy a
block below. Suggested labels are listed per issue. This file can be deleted once
the issues exist.

> Repo: `SamLizard/torah_roll_helper` · default working branch: `dev`

---

## 1. Better / on-device OCR for the photo flow
**Labels:** enhancement, help wanted, ocr

**Problem**
Photo input currently relies on the external Dicta OCR + Parallels APIs, plus a
local Tesseract first-line matcher with fuzzy search over `page_first_lines.json`.
Accuracy on vocalized STA"M ksav and varied lighting/angles is the weak point, and
the Dicta dependency means that part of the app isn't truly offline.

**Ask**
Looking for someone with strong OCR experience to propose a better pipeline:
- A model that reads vocalized Hebrew / Torah ksav reliably, ideally on-device.
- Combined with light fuzzy search over the per-layout first lines so we map a
  photo to a page with high confidence.

**Context / pointers**
- `src/composables/dictaApi.ts` — Dicta OCR + Parallels calls.
- `src/composables/firstLineOcr.ts` — Tesseract worker + fuzzy match + reliability.
- `src/composables/firstLineSearch.ts` — normalization + prepared first lines.
- Data: `src/data/<pageCount>/page_first_lines.json`.

**Constraints**
Frontend-only, prefer offline/PWA-friendly, must work in-browser (incl. mobile),
and respect RTL/Hebrew. Accuracy beats coverage.

---

## 2. Other ways to recognize the page the scroll is open on
**Labels:** enhancement, research, ocr

**Problem**
Reading the first line via photo is one approach. There may be better/faster ways
to detect which column a Sefer Torah is currently open to in a noisy shul setting.

**Ask**
Ideas and prototypes welcome: image matching against known columns, detecting
column boundaries/geometry, QR/markers on the atzei chayim, audio of the reading,
manual landmarks, etc. Trade-offs in accuracy and effort appreciated.

**Constraints**
Frontend-only, offline-friendly preferred, fast enough to use mid-service.

---

## 3. PWA persistent-use ideas
**Labels:** enhancement, pwa, discussion

**Problem**
The app is a PWA (`vite-plugin-pwa`) and persists a little state via
`pinia-plugin-persistedstate` (see `src/stores/options.ts` and
`src/composables/storageKeys.ts`). We want to make installed/offline use genuinely
better, not just installable.

**Ask**
What should persistence enable? e.g. fully offline OCR assets, cached calendar,
remembering last-used FROM/TO, quick re-open of the last result, install guidance.

**Constraints**
No server. Keep it working offline. Mind storage limits on mobile.

---

## 4. "My Sifrei Torah" — save and reuse scrolls
**Labels:** enhancement, pwa, data

**Problem**
A user often reads from the same physical scrolls. Today there's no way to save one.

**Proposal**
Let a user save a Sefer Torah (name + chosen layout, optionally a reference text
and/or photo). When they pick a saved scroll, default the FROM side to the last
parasha placed on it — i.e. the previous reading's `refEnd` (see `refEnd` /
`refEndPartial` in `src/data/target_pages.json` and `src/composables/readingTargets.ts`).

**Open questions**
- Where to store (localStorage vs IndexedDB for images)?
- How to record "last parasha placed" after a reading is completed?

**Constraints**
No server, offline-friendly.

---

## 5. Auto-suggest which scroll to use, from calendar + rules
**Labels:** enhancement, calendar

**Problem**
When several scrolls are saved (issue #4), choosing the right one each time is
manual.

**Proposal**
Let users define rules ("use scroll A on Shabbat, scroll B for weekday readings,
scroll C for festivals…"). Combine with the Hebcal-driven calendar
(`src/composables/calendar/`, `@hebcal/leyning`, `@hebcal/hdate`) to auto-propose a
scroll for the upcoming reading.

**Depends on:** issue #4.

**Constraints**
No server. Rules stored locally.

---

## 6. Data portability — export / import / device-to-device share
**Labels:** discussion, pwa, data

**Question**
If user data (saved scrolls, rules, settings) lives only in browser storage, it's
fragile and trapped on one device. Should we:
- Export/import a JSON (and images) file?
- Share directly device-to-device (QR, Web Share, WebRTC, file)?
- Something else?

Maintainer preference is to **stay server-less for now**. Looking for opinions and
a recommended approach + format. Storage keys today are namespaced
`torah-roll-helper:*` (see `src/composables/storageKeys.ts`).

---

## 7. Rites / minhagim — what differs, so we can add more
**Labels:** research, data, help wanted

**Question**
Currently only `sefaradic` nusach exists (`NUSACH_OPTIONS` in
`src/stores/options.ts`). For someone who knows Hebcal and the relevant halachot:
what actually differs between rites for our purposes — reading divisions,
sheni/hamishi ends (`refEndPartial`), holiday readings, Israel vs Gola — so we can
model additional rites correctly?

See the README "Add a new nusach option" recipe and `src/data/target_pages.json`.

---

## 8. UI/UX redesign proposal
**Labels:** enhancement, design, help wanted

**Ask**
Looking for a UI/UX designer to propose a cleaner look and smoother flow for the
two-sided FROM/TO workflow, the target browser, the camera flow, and the result
panel — across desktop and mobile, in LTR and RTL, in three+ languages.

Mockups or a Figma link welcome before code. Built on Vuetify 3; please keep
i18n/RTL in mind.

---

## 9. Project governance: add a LICENSE (and maybe a CoC)
**Labels:** chore, governance

**Problem**
There is no `LICENSE` file. Without one, outside contributions are legally
ambiguous and people may hesitate to contribute.

**Ask**
Maintainer to choose and add a license (e.g. MIT for permissive, or AGPL if you
want to keep derivatives open). Consider a short Code of Conduct too. Once added,
update `CONTRIBUTING.md` to drop the "no license yet" warning.
