# Add a Torah scroll layout (page count)

**Difficulty:** medium–hard · Requires accurate scroll data, not just coding.

Every Sefer Torah is written on a specific *klaf* layout, so the same verse falls
on a different **column/page** depending on the scroll. The app normalizes
everything to a **page number**, then computes:

```
pages     = abs(toPage - fromPage)
direction = forward | backward
```

A "layout" is identified by its **total page count** (e.g. `245`, `226`, `248`).
Layouts already present live in `src/data/<pageCount>/`. The registry is
[`src/composables/torahData.ts`](../../src/composables/torahData.ts).

> The hard part is **the data**, not the wiring. You need a reliable source that
> maps every verse to a column/page for the target scroll. Layout `248` is already
> scaffolded in code but commented out in `TORAH_TYPE_OPTIONS` because its lines
> "couldn't be verified" — accuracy matters more than coverage.

## The data model

A layout folder `src/data/<pageCount>/` contains three files.

### `real_db.json` — verse → page index

A 5-element array (one per book: Bereshit…Devarim). Each book is an array of
`[chapter, verse, page]` triples, sorted, marking the **first verse that starts on
each page**. Page lookup is a binary search over these triples.

```json
[
  [ [1,1,1], [1,26,2], [2,18,3], ... ],   // Bereshit
  [ ... ],                                  // Shemot
  ...
]
```

So `[1, 26, 2]` means "Bereshit 1:26 is where page 2 begins".

### `page_first_lines.json` — first line(s) of each page (for OCR/search)

One entry per page, in page order, used by the photo-OCR matcher and the
first-line search dialog. Each entry mirrors the **same two-level structure as the
tikkun.io source `text`**:

- The **outer array is columns.** Almost every page has one column. The exception
  is Haazinu, whose poem is written in two side-by-side columns on a page — there
  the entry has two arrays.
- Each **column is an array of segments**, split where there is a *setuma* (a gap
  in the middle of a line). Most columns have a single segment.

```json
[
  [[ "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃" ]],
  [[ "וְאַתָּ֖ה תְּשׁוּפֶ֥נּוּ עָקֵֽב׃", "אֶֽל־" ]],
  [[ "וַתִּיקַ֖ד עַד־שְׁא֣וֹל תַּחְתִּ֑ית" ], [ "וַתֹּ֤אכַל אֶ֙רֶץ֙ וִֽיבֻלָ֔הּ" ]]
]
```

So `[["A","B"]]` is **one column with a setuma** between A and B, while
`[["A"],["B"]]` is **two columns** (Haazinu). The text must be the exact source
text (letters and vowels/te'amim). A recorded line may be shorter than the full
physical line — record up to wherever you stopped — but it must be an exact prefix
of the source and keep the setuma/column splits.

The array length must equal `<pageCount>`.

### `page_titles_keys.json` — parasha key(s) per page

One entry per page (length = `<pageCount>`). Each entry lists the parasha key(s)
that appear on that page (used for page titles/preview).

```json
[
  [ "bereshit" ],
  [ "bereshit" ],
  ...
]
```

**You don't write this file by hand.** The generator script (step 2) produces it
for you from `real_db.json` + the first lines.

## Steps

### 1. Create the two input files

Create `src/data/<pageCount>/` and add only the two files **you** are responsible
for:

- `real_db.json` — covers all 5 books with correct `[chapter, verse, page]` triples.
- `page_first_lines.json` — exactly `<pageCount>` entries.

The third file (`page_titles_keys.json`) and the per-target page numbers in
`target_pages.json` are generated and verified in the next step.

### 2. Run the generator

[`src/scripts/generate-layout-data.ts`](../../src/scripts/generate-layout-data.ts)
does three things at once: it **verifies** your two files against the original
Torah text, **updates** `src/data/target_pages.json` with this layout's page
numbers, and **generates** `src/data/<pageCount>/page_titles_keys.json`.

```bash
# from the repo root
npm run generate-layout-data -- --layout <pageCount>

# preview without writing any files
npm run generate-layout-data -- --layout <pageCount> --dry-run
```

If the page count can't be inferred from `page_first_lines.json`, pass it
explicitly: `--page-count <n>`.

**Torah source files.** The script needs the original tikkun.io Torah page JSON
(`1.json`..`245.json`). By default it looks in `scripts/torah`. If you don't have
that folder (it isn't shipped in a clean clone), download the tikkun.io export and
point the script at it:

```bash
npm run generate-layout-data -- --layout <pageCount> --source-dir path/to/torah-json
```

**What it checks (and refuses to write on failure):**

- `real_db.json` has exactly one valid entry per page, no duplicates, all within
  `1..pageCount`.
- `page_first_lines.json` has exactly `<pageCount>` entries. Each entry is found in
  order in the Torah text, is the **exact** source text (letters and
  vowels/te'amim), maps to the verse `real_db.json` claims starts that page, and
  has the **right column/setuma structure** (it won't accept a setuma merged into
  one string, or a two-column Haazinu page collapsed into one).
- The base `245` layout still verifies (a safety net for the shared logic).

When it succeeds it prints how many `target_pages` refs it set and where it wrote
the title-keys file. Read any error: it names the exact page and the
expected/actual text or verse so you can fix your input.

**Auto-fixing the first lines.** If the verifier reports problems with
`page_first_lines.json` (wrong vowels, a merged setuma, etc.), you can let the
script rewrite that file from the source — exact text and correct
setuma/column segmentation, keeping each line's length:

```bash
# preview which pages would change
npm run generate-layout-data -- --layout <pageCount> --fix-first-lines --dry-run

# actually rewrite page_first_lines.json
npm run generate-layout-data -- --layout <pageCount> --fix-first-lines
```

It only rewrites pages that fail verification, leaves correct pages byte-for-byte
untouched, and re-running it changes nothing. Always review the git diff
afterward — you have git to roll back if needed.

> The script never rewrites a file whose content hasn't actually changed (it
> preserves the existing line endings), so a no-op run leaves a clean `git status`.

Other useful flags (run with `--help` to see all): `--real-db`, `--first-lines`,
`--title-keys-output`, `--target-pages`.

### 3. Register the layout in `torahData.ts`

In [`src/composables/torahData.ts`](../../src/composables/torahData.ts), import the
three files and add an entry to `LAYOUT_DATA`:

```ts
import realDb<pageCount> from '@/data/<pageCount>/real_db.json';
import pageFirstLines<pageCount> from '@/data/<pageCount>/page_first_lines.json';
import pageTitlesKeys<pageCount> from '@/data/<pageCount>/page_titles_keys.json';

const LAYOUT_DATA: Record<string, LayoutData> = {
  // ...existing...
  '<pageCount>': {
    realDb: realDb<pageCount> as RealDb,
    pageFirstLines: pageFirstLines<pageCount> as PageFirstLine[],
    pageTitlesKeys: pageTitlesKeys<pageCount> as string[][],
  },
};
```

The layout key is the **string of the page count** (e.g. `'226'`).

### 4. Add the option in the store

In [`src/stores/options.ts`](../../src/stores/options.ts), add to `TORAH_TYPE_OPTIONS`:

```ts
const TORAH_TYPE_OPTIONS = [
  { id: 'klaf_245', pageCount: 245 },
  { id: 'klaf_226', pageCount: 226 },
  { id: 'klaf_<pageCount>', pageCount: <pageCount> },
] as const;
```

`getLayoutKey()` turns the `pageCount` into the layout key used by `torahData.ts`,
so no other store wiring is needed.

### 5. Add the translation label

Add a key `settings.torahTypeOptions.klaf_<pageCount>` in **every** locale file in
`src/locales/` (`en.json`, `fr.json`, `he.json`, and any others). See
[add-a-language.md](add-a-language.md).

> Step 2 already added the `"<pageCount>"` key to every `page` object in
> `src/data/target_pages.json`. If you ever need to do it by hand, every `ref`,
> `refEndPartial`, and `refEnd` has a `page` object keyed by layout — add your
> `"<pageCount>"` to each, or `resolvePageForLayout()` falls back to `245` and the
> roll counts will be wrong.

## Verify your data

The generator (step 2) already verified `real_db.json` and `page_first_lines.json`
against the Torah text. As an extra check, run the reference-page sanity script,
which flags reading references that look like they sit on the wrong page boundary:

```bash
npm run list-questionable-reference-pages
```

> Note: this script currently checks layout `245` only (see
> `scripts/list-questionable-reference-pages.ts`, `LAYOUT_KEY = '245'`).

Then test in the app:

```bash
npm run dev
```

- Pick your new layout in Settings.
- Spot-check several known references (manual entry) against the real scroll.
- Test the photo/first-line flow on a few pages.
- `npm run type-check` and `npm run lint` before the PR.

## Checklist

- [ ] `src/data/<pageCount>/real_db.json` (5 books, correct triples)
- [ ] `src/data/<pageCount>/page_first_lines.json` (length = `<pageCount>`)
- [ ] `npm run generate-layout-data -- --layout <pageCount>` passes and writes
      `page_titles_keys.json` + updates `target_pages.json`
- [ ] `LAYOUT_DATA` entry in `torahData.ts`
- [ ] `TORAH_TYPE_OPTIONS` entry in `options.ts`
- [ ] `settings.torahTypeOptions.klaf_<pageCount>` in all locales
- [ ] Verified with the sanity script and against a real scroll
