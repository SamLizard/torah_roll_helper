# Add a language (translation)

**Difficulty:** easy · **No deep coding needed** — mostly JSON editing.

The app ships with English (`en`), Hebrew (`he`), and French (`fr`). Adding a new
language means providing a locale file with the same keys, a flag icon, and
registering the locale.

Pick the correct **language code** — not a name you invent. The filename (without
`.json`) becomes the locale id used everywhere in the app, and that id is passed to
the browser's `Intl.DateTimeFormat` (for calendar dates, in
`src/components/LocationSelector.vue`) and to Vuetify's locale/RTL system. An
invalid code (e.g. `mylang`) will break date formatting and Vuetify lookups.

We'll call it `<lang>` below, and the **same** `<lang>` must be used everywhere
(locale file name, flag file name, and i18n registration).

### How to find your language's code (no coding needed)

Use the standard two-letter **ISO 639-1** code for your language. To find it:

1. Open the list of codes on Wikipedia:
   **[List of ISO 639 language codes](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes)**.
2. Find your language in the table and read its two-letter code from the
   **"639-1"** column (e.g. Spanish = `es`, Russian = `ru`, German = `de`,
   Italian = `it`, Yiddish = `yi`, Arabic = `ar`).

Only add a region/script suffix if your language really needs one — and only use a
value that exists in the Vuetify list below (e.g. `zh-Hans` / `zh-Hant` for
Simplified / Traditional Chinese, `pt` for Portuguese).

### Languages Vuetify already translates

If your code is in this list, Vuetify's own UI strings (date pickers, etc.) are
translated too — just register it in step 3. If it is **not** in the list, your
language still works; only Vuetify's internal strings fall back to English.

```
af, ar, az, bg, ca, ckb, cs, da, de, el, en, es, et, fa, fi, fr, he, hr, hu,
id, it, ja, km, ko, lt, lv, nl, no, pl, pt, ro, ru, sk, sl, sr-Cyrl, sr-Latn,
sv, th, tr, uk, vi, zh-Hans, zh-Hant
```

(This is the current list of files under `node_modules/vuetify/lib/locale/`.)

> The code matters: the locale id is also passed to the browser's
> `Intl.DateTimeFormat` (calendar dates, in `src/components/LocationSelector.vue`)
> and to Vuetify's locale/RTL system. An invented code (e.g. `mylang`) breaks date
> formatting and Vuetify lookups, so stick to a real ISO 639-1 code.

## 1. Create the locale file

Copy `src/locales/en.json` to `src/locales/<lang>.json` and translate the
**values only**. Keep every key exactly as-is — keys are how the app looks up text.

```bash
# from the repo root
cp src/locales/en.json src/locales/<lang>.json
```

Rules:
- Do **not** rename, add, or remove keys. If a key is missing, the app falls back
  to English, so a partial translation still works but leaves English gaps.
- Keep placeholders/interpolation tokens (anything like `{count}`, `{page}`) intact.
- Don't translate proper nouns that are app/brand names unless it's standard in
  your language.

## 2. Add the flag icon

Add `public/flags/<lang>.svg` — it must use the **same `<lang>` code** as the
locale file (the selector loads it as `flags/<lang>.svg`, see
`src/components/LanguageSelection.vue`).

Use the **official** flag, not a hand-made one. Get it from Wikimedia Commons,
which hosts the official SVG flags:

1. Go to Wikipedia/Wikimedia Commons and search "Flag of <country>" — e.g. the
   [Flag of France](https://en.wikipedia.org/wiki/File:Flag_of_France.svg).
2. Download the **SVG** version.
3. Save it as `public/flags/<lang>.svg`.

Notes:
- Pick the flag that best represents the language's main community (for some
  languages this is a national flag; choose the most widely recognized one).
- SVG keeps it crisp at any size; it renders at `width="50"` in the menu.

## 3. Register the locale

The locales are loaded automatically from `src/locales/` by
`@intlify/unplugin-vue-i18n` and merged with Vuetify's built-in locale messages in
[`src/plugins/i18n.ts`](../../src/plugins/i18n.ts).

`i18n.ts` currently imports Vuetify locale messages explicitly:

```ts
import { he, en, fr } from 'vuetify/locale';

const messages = mapValues({ he, en, fr }, (messages, key) => {
  return defaults(sourceMessages?.[key], { $vuetify: messages });
});
```

If Vuetify ships your language, add it here so Vuetify's own UI strings
(date pickers, etc.) are also translated:

```ts
import { he, en, fr, es } from 'vuetify/locale';   // add `es`
const messages = mapValues({ he, en, fr, es }, /* ... */);
```

If Vuetify does **not** ship your language, it will still work — it just falls
back to English for Vuetify's internal strings.

> Note: when importing from `vuetify/locale`, the export name is the locale id
> with no dash — e.g. `zh-Hans` is imported as `zhHans`, `sr-Cyrl` as `srCyrl`.
> For plain two-letter languages the import name and locale id are identical
> (`es`, `ru`, …), which is the simple, recommended case. If you need a
> script/region variant, open an issue and we'll help wire it up.

## 4. Set RTL if needed

If your language is right-to-left (Arabic, Farsi, etc.), add it to the `rtl` map
in [`src/plugins/vuetify.ts`](../../src/plugins/vuetify.ts):

```ts
locale: {
  rtl: {
    en: false,
    he: true,
    fr: false,
    fa: true,   // example: Farsi is RTL
  },
  // ...
}
```

For left-to-right languages you can either add `<lang>: false` or leave it out.

## 5. Test it

```bash
npm run dev
```

- Open the language selector and switch to your language.
- Walk through the main flows: FROM/TO selection, the settings dialog, the manual
  entry dialog, the camera/photo flow, and the result panel.
- Check for clipped or overflowing text, and (for RTL) that arrows and dialogs
  mirror correctly.
- Run `npm run type-check` and `npm run lint` before opening the PR.

## 6. Open a PR

Target the `dev` branch. In the description, mention which language you added and
whether Vuetify provides built-in messages for it.

## Notes

- The selected language is stored in `localStorage` under
  `torah-roll-helper:language` (see `src/composables/storageKeys.ts`).
- A partial translation is acceptable as a first PR; missing keys fall back to
  English. Follow-up PRs can complete it.
