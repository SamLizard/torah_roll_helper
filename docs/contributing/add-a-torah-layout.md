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

One entry per page, in page order. Each entry is an array of line "segments"
(vocalized Hebrew text) used by the photo-OCR matcher and the first-line search
dialog.

```json
[
  [[ "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃" ]],
  [[ "וְאֵ֛ת כׇּל־רֶ֥מֶשׂ הָֽאֲדָמָ֖ה לְמִינֵ֑הוּ ..." ]],
  ...
]
```

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

## Steps

### 1. Create the data folder

Create `src/data/<pageCount>/` with the three files above. Make sure:
- `real_db.json` covers all 5 books with correct `[chapter, verse, page]` triples.
- `page_first_lines.json` and `page_titles_keys.json` each have exactly
  `<pageCount>` entries.

### 2. Register the layout in `torahData.ts`

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

### 3. Add the option in the store

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

### 4. Add the translation label

Add a key `settings.torahTypeOptions.klaf_<pageCount>` in **every** locale file in
`src/locales/` (`en.json`, `fr.json`, `he.json`, and any others). See
[add-a-language.md](add-a-language.md).

### 5. Add per-target page numbers

In [`src/data/target_pages.json`](../../src/data/target_pages.json), every `ref`,
`refEndPartial`, and `refEnd` has a `page` object keyed by layout. Add a
`"<pageCount>"` key to **every** `page` object:

```json
"page": {
  "226": 1,
  "245": 1,
  "248": 1,
  "<pageCount>": 1
}
```

If you skip this, `resolvePageForLayout()` falls back to the default layout (`245`),
which will give wrong roll counts for your layout.

## Verify your data

Run the data-sanity script, which flags reading references that look like they sit
on the wrong page boundary:

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
- [ ] `src/data/<pageCount>/page_titles_keys.json` (length = `<pageCount>`)
- [ ] `LAYOUT_DATA` entry in `torahData.ts`
- [ ] `TORAH_TYPE_OPTIONS` entry in `options.ts`
- [ ] `settings.torahTypeOptions.klaf_<pageCount>` in all locales
- [ ] `"<pageCount>"` page key added to every `page` in `target_pages.json`
- [ ] Verified with the script and against a real scroll
