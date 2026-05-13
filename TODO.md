## ~~Task 1 — Rename action buttons~~ ✅ DONE
**Files:** `src/locales/en.json`, `src/locales/fr.json`, `src/locales/he.json`

Update the `home.actions` keys as follows. The `choose` button opens the full reading list (TargetOptionsGrid). The `input` button opens the manual entry dialog which contains ref/page/first-line search — so both buttons now use the word "choose" to make their purpose parallel.

```
home.actions.choose:
  EN: "Choose reading"
  FR: "Choisir une lecture"
  HE: "בחר קריאה"

home.actions.input:
  EN: "Choose by ref."
  FR: "Choisir par réf."
  HE: "בחר לפי ייחוס"
```

---

## ~~Task 2 — Show result without scrolling~~ ✅ DONE
**File:** `src/views/HomeView.vue`

On mobile the full result card is below both location cards and requires scrolling. Replace the current plain down-arrow row (`d-flex d-md-none`) with a new compact component that sits between the two cards.

**Behavior:**
- When neither or only one page is set: shows only the down arrow, same as today
- When both pages are set: shows the arrow plus compact result inline — e.g. `↓ 47 cols · Forward` using the same color logic as the full result (primary for forward, secondary for backward)
- Clicking anywhere on the component scrolls smoothly to the full `RollResult` card below (`element.scrollIntoView({ behavior: 'smooth', block: 'start' })`)

The full `RollResult` card below is unchanged. The new component is mobile-only (`smAndDown`). On desktop the result is already visible alongside the cards.

---

## ~~Task 3 — Empty state helper text~~ ✅ DONE
**Files:** `src/components/LocationSelector.vue`, locale files

When no page is selected, add a short second line below "No page selected", specific to each card side:

```
home.from.emptyHint:
  EN: "Where is the Torah scroll currently open?"
  FR: "Où le Sefer Torah est-il actuellement ouvert ?"
  HE: "היכן ספר התורה פתוח כעת?"

home.to.emptyHint:
  EN: "Choose the upcoming reading"
  FR: "Choisissez la prochaine lecture"
  HE: "בחר את הקריאה הבאה"
```

Style with `text-body-2 text-medium-emphasis mt-1`. Place directly below the existing "No page selected" line.

---

## ~~Task 4 — Preview button hint~~ ✅ DONE
**File:** `src/components/LocationSelector.vue`, locale files

Add a short text label that appears after the preview icon button inline in the same row as the page number. See Task 7f for the exact layout — this hint text is part of that layout change, not a separate element.

Add the locale key:
```
preview.openPage (replace or supplement existing):
  EN: "Preview"
  FR: "Aperçu"
  HE: "תצוגה מקדימה"
```

The label renders as a small `text-caption` span directly after the preview `v-btn` inside `.location-page-number-shell`. See Task 7f for the full description of the row layout.

---

## ~~Task 5 — Gola/Israel first-use notice~~ ✅ DONE
**Files:** `src/views/HomeView.vue`, `src/stores/options.ts`, locale files

A user opening the app for the first time is silently in Israel mode. If they are in the Diaspora, the readings shown in the calendar strip will be wrong some weeks. They have no indication of this unless they explore Settings.

Show a one-time dismissible inline banner **on the home page, above the FROM card** (not a popup — avoiding two simultaneous notifications on first visit alongside the existing tutorial prompt). Use a Vuetify `v-alert` with `type="info"` and `variant="tonal"` placed above the cards row.

Show it only once: store a flag `trh:gola-notice-seen` in `localStorage` (same pattern as the existing tutorial state in `src/composables/tutorials.ts`). Once the user dismisses it or toggles the switch, mark it as seen and hide permanently.

The banner contains:
- A short explanatory sentence
- The gola `v-switch` directly inline (bound to the same `optionsStore.isInGola` as in SettingsDialog)
- A dismiss button

```
home.golaBanner.text:
  EN: "Readings are set to Israel. Are you outside Israel?"
  FR: "Les lectures sont configurées sur Israël. Êtes-vous en dehors d'Israël ?"
  HE: "הקריאות מוגדרות לישראל. האם אתם בחוץ לארץ?"

home.golaBanner.dismiss: (reuse actions.close)
```

---

## Task 6 — Result card improvements
**File:** `src/components/RollResult.vue`, locale files

**6a — Clearer direction labels:**
Update the direction strings to include a physical reference so Gabbaim know which way to turn:

```
result.direction.forward:
  EN: "Forward (toward Devarim)"
  FR: "Vers l'avant (vers Devarim)"
  HE: "קדימה (לכיוון דברים)"

result.direction.backward:
  EN: "Backward (toward Bereshit)"
  FR: "Vers l'arrière (vers Bereshit)"
  HE: "אחורה (לכיוון בראשית)"
```

**6b — "Remaining after book" more visible:**
Two changes in `RollResult.vue`:

1. Move the `remainingAfterBook` block to appear **above** the direction line in the template.
2. Change its styling from `text-caption mt-1 text-medium-emphasis` to `text-body-2 mt-2`, and add a book icon before the text:

```html
<div class="d-flex align-center justify-center gap-1 mt-2 text-body-2">
  <v-icon size="16">mdi-book-open-page-variant-outline</v-icon>
  <span>{{ $t('result.remainingAfterBook', { ... }) }}</span>
</div>
```

This uses the same icon as the page preview so users already have a visual association with it.

---

## Task 7 — Reduce card height
**File:** `src/components/LocationSelector.vue`

Apply all changes to `LocationSelector.vue` and its scoped styles.

**7a — Remove space before the calendar:**
In `.location-calendar-slide-shell` remove `padding-top: 16px`. In `.location-calendar-section` reduce `padding: 12px 16px 8px` to `padding: 4px 12px 4px`.

**7b — Equal-height cards only on desktop:**
The card has `class="h-100 d-flex flex-column"` and the body `v-card-text` has `class="flex-grow-1 ..."`. Both force the card to full column height regardless of content. This is correct on desktop (so FROM and TO match height side by side) but wastes vertical space on mobile.

Apply `h-100` and `flex-grow-1` only on `md` and above. On mobile let the card shrink to its natural content height.

**7c — Reduce general paddings/margins:**
- Override `v-card-item` default padding to `pa-2`
- Reduce `mb-2` on `.location-page-number-shell` to `mb-1`
- Reduce `mt-2` on `resolvedPageTitle` to `mt-1`
- Remove `mt-4` on the clear button (it moves to a corner — see 7e)

**7d — Empty state: less vertical padding:**
Change `py-6` on the empty state div to `py-2`.

**7e — Clear button in a corner:**
Remove the clear button from its current position as a standalone row in the body. Reposition it as a small icon-only button (`mdi-close`, `size="small"`, `variant="text"`, `color="error"`) absolutely positioned in the top-inline-end corner of the body `v-card-text`, similar to how `.location-page-preview-btn` is already positioned. Add `aria-label` with the translated "Clear" string. The button remains hidden when `page === null`.

**7f — PAGE label left of number, preview button and hint right of number:**
Currently the layout is:
```
[preview btn (absolute right)] [big number (centered)]
[PAGE label below]
```

Rearrange the `.location-page-number-shell` into a single flex row with three zones:

```
LTR: [PAGE label]  [big number]  [📖 button]  [preview hint text]
RTL: [preview hint text]  [📖 button]  [big number]  [PAGE label]
```

- Remove the separate `<div class="text-caption">{{ $t('page') }}</div>` element below the shell entirely.
- Inside the shell, add the PAGE label as an inline `text-caption text-uppercase` span on the inline-start side.
- Keep the large number button centered.
- Keep the preview `v-btn` on the inline-end side (right in LTR) — its current absolute positioning can be kept or converted to flex depending on what is simpler.
- Add the preview hint text (from Task 4, `preview.openPage`) as a small `text-caption` span directly after the preview button.

The `mod-rtl` class already handles mirroring for the preview button; apply the same mirroring logic to the PAGE label so both sides swap correctly in RTL.

---

## Task 8 — First line search improvements
**Files:** `src/components/FirstLineSearchDialog.vue`, locale files

**8a — Scroll layout note:**
Add a single quiet line below the description and above the search field:

```
firstLineSearch.layoutNote:
  EN: "Works with the scroll layout set in Settings (currently: {layout})"
  FR: "Fonctionne avec la mise en page des paramètres (actuellement : {layout})"
  HE: "עובד עם פריסת הספר בהגדרות (כרגע: {layout})"
```

Pass the current `torahType` label from the options store as `{layout}`. Style with `text-caption text-medium-emphasis`. This is informational only — shown to all users but only matters to the minority with non-standard scrolls.

**8b — Label both toggle states:**
The current `v-switch` for `includeMatches` only has a label for the ON state. Make the label dynamic to show the current state explicitly:

```
firstLineSearch.searchFromStart:
  EN: "Line starts with these words"
  FR: "La ligne commence par ces mots"
  HE: "השורה מתחילה במילים אלו"
```

Bind `:label` to a computed: when `includeMatches` is `false` use `searchFromStart`, when `true` use the existing `searchAnywhere`.

**8c — Simplify OCR presentation:**
The OCR panel currently shows raw text vs corrected text side by side, OCR confidence percentage, and a technical low-quality warning. Replace with a simpler flow:

1. After OCR completes, insert the corrected text into the search field silently (already done). **Hide the raw/corrected comparison grid entirely** — remove the `first-line-search-ocr__grid` section from the template.
2. If `isOcrResultLowQuality` is true, replace the current technical alert with a simple plain message:

```
firstLineSearch.ocrLowQuality:
  EN: "The photo wasn't clear enough. Try a tighter shot of the first line, or type the words manually."
  FR: "La photo n'était pas assez nette. Prenez une photo plus serrée de la première ligne, ou saisissez les mots manuellement."
  HE: "התמונה לא הייתה מספיק ברורה. נסו צילום קרוב יותר של השורה הראשונה, או הקלידו את המילים ידנית."
```

3. Keep the best-match summary box (`assistantSummary`) but replace the confidence chip labels — remove percentages entirely from `getConfidenceChipLabel`. Return plain language only:

```
firstLineSearch.ocrConfirmed  → EN: "Strong match"   FR: "Correspondance sûre"     HE: "התאמה ברורה"
firstLineSearch.ocrLikely     → EN: "Possible match"  FR: "Correspondance probable"  HE: "התאמה אפשרית"
firstLineSearch.ocrUnreliable → EN: "Uncertain"        FR: "Incertain"               HE: "לא ודאי"
```

Remove the `{value}%` from all three — do not show percentages to the end user.

4. Keep the "Restore OCR results" button (`canRestoreOcrResults`) as the only escape hatch for users who want to see or re-apply the OCR text. Its current label is fine.

## Task 9 — No-results hint in first-line search
**File:** `src/components/FirstLineSearchDialog.vue`, locale files

When the user has typed enough letters but gets no results (`isQueryReady` is true, `displayedSearchResults` is empty, not in OCR assistant mode), the current message is a generic "No matching opening lines found" with a generic hint. Enrich this to explain possible reasons and offer a direct action.

Show two additional elements below the existing "no matches" message:

**1 — Scroll layout note (if results are truly zero):**
A small secondary line suggesting the scroll layout might not match:
```
firstLineSearch.noMatchesLayout:
  EN: "Make sure the scroll layout in Settings matches your Sefer Torah."
  FR: "Vérifiez que la mise en page dans les paramètres correspond à votre Sefer Torah."
  HE: "ודאו שפריסת הספר בהגדרות תואמת את ספר התורה שלכם."
```
Style with `text-caption text-medium-emphasis`. Only show this when `includeMatches` is false (i.e. the user is searching from the start, which is more strict).

**2 — Direct toggle action:**
When `includeMatches` is false, add a small `v-btn` with `variant="text"` and `size="small"` that directly sets `includeMatches = true` when clicked, with label:
```
firstLineSearch.noMatchesTryAnywhere:
  EN: "Search anywhere in the line instead"
  FR: "Chercher n'importe où dans la ligne"
  HE: "חפשו בכל מקום בשורה"
```
This saves the user from having to scroll back up to find and understand the toggle. Once clicked, results (if any) appear immediately. Do not show this button when `includeMatches` is already true.

---

## Task 10 — Retry camera button prominent in Dicta overlay
**File:** `src/views/HomeView.vue`, locale files

In the Dicta overlay, when the result is `no-result` or `error`, the user currently has two recovery paths:
- "Type the first words instead" — shown prominently in the **center** of the overlay content
- "New photo" — shown only as a small button in the **toolbar at the top** of the overlay

This asymmetry means the retry option is easy to miss while the first-line fallback is obvious. Add the retry camera button alongside "Type the first words instead" in the center content area so both options are equally visible.

In both the desktop overlay and the mobile overlay, inside the `dictaFlowState === 'no-result'` and `dictaFlowState === 'error'` blocks, add a second `v-btn` next to the existing "Type first words" button:

```html
<v-btn
  size="small"
  variant="tonal"
  prepend-icon="mdi-camera-retake"
  @click="onDictaRetake"
>
  {{ $t('home.dicta.newPhoto') }}
</v-btn>
```

Place both buttons in a `d-flex gap-2 justify-center flex-wrap` container so they sit side by side (or wrap on very narrow screens). The existing "New photo" button in the toolbar can remain as-is — having it in both places is intentional, since users may look in either location.