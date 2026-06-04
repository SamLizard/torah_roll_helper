# Add a language (translation)

**Difficulty:** easy · **No deep coding needed** — mostly JSON editing.

The app ships with English (`en`), Hebrew (`he`), and French (`fr`). Adding a new
language means providing a locale file with the same keys, a flag icon, and
registering the locale.

Use a two-letter code where possible (e.g. `es`, `ru`, `de`). We'll call it
`<lang>` below.

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

Add `public/flags/<lang>.svg`. It must use the **same `<lang>` code** as the
locale file. Match the style/size of the existing flags in `public/flags/`
(`en.svg`, `fr.svg`, `he.svg`).

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
