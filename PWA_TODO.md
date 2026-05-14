# PWA Implementation TODO

This document lists everything needed to turn Torah Roll Helper into a fully functional Progressive Web App (installable on Android and iOS home screens, with offline support and persistent settings).

Related TODOs from `src/App.vue`:
- **TODO 29** — Make PWA so user settings are remembered long term
- **TODO 30** — Explain how to add to Apple home screen
- **TODO 31** — Cache user preferences (language + settings) in localStorage

---

## 1. DONE — Install `vite-plugin-pwa`

```bash
npm install -D vite-plugin-pwa
```

This is the standard zero-config PWA plugin for Vite. It generates the web manifest and service worker automatically at build time.

---

## 2. DONE — Generate icon assets from existing images

You have two source images in `public/icon/`:
- `bright_mode.png` — for light theme / standard display
- `dark_mode.png` — for dark theme

**Required icon sizes** (generate from your source PNGs):

| Size | Purpose | Filename |
|------|---------|----------|
| 192×192 | Android home screen, manifest | `public/icon/pwa-192x192.png` |
| 512×512 | Android splash screen, manifest | `public/icon/pwa-512x512.png` |
| 180×180 | Apple touch icon (iOS) | `public/icon/apple-touch-icon-180x180.png` |
| 192×192 | Maskable (Android adaptive icon) | `public/icon/pwa-maskable-192x192.png` |
| 512×512 | Maskable (Android adaptive icon) | `public/icon/pwa-maskable-512x512.png` |

**Maskable icons** must have the main content within the "safe zone" (inner 80% circle). Add padding/background around the logo so Android's adaptive icon shapes don't crop it. Use https://maskable.app/editor to test.

**Dark mode icons**: For Android, you can provide `dark_mode.png` variants as well. The manifest supports a `purpose: "any"` icon for each theme. However, browser support for dark-mode manifest icons is still limited — start with the bright mode icon as the primary.

**Favicon — unify with the PWA icon:**

The current `public/favicon.ico` is a separate file from the app icons. Replace it so the browser tab icon matches the PWA home screen icon. Generate from the same `bright_mode.png` source:

| File | Sizes embedded | Notes |
|------|---------------|-------|
| `public/favicon.ico` | 16×16, 32×32, 48×48 | Multi-size `.ico` for legacy browsers |
| `public/icon/favicon-96.png` | 96×96 | Modern browsers (used via `<link rel="icon">`) |

Then update `index.html`:
```html
<link rel="icon" type="image/png" sizes="96x96" href="/torah_roll_helper/icon/favicon-96.png">
<link rel="icon" href="/torah_roll_helper/favicon.ico" sizes="48x48">
```

The key point: **all icons (favicon, PWA manifest, apple-touch-icon) must come from the same source image** so the app looks consistent everywhere — browser tabs, Android home screen, iOS home screen, and task switchers.

**Tools to generate all sizes:**
- [pwa-asset-generator](https://github.com/nicedoc/pwa-asset-generator) (CLI)
- [Vite PWA Assets Generator](https://vite-pwa-org.netlify.app/assets-generator/) (integrated with vite-plugin-pwa)
- [RealFaviconGenerator](https://realfavicongenerator.net/) — generates favicon.ico + all PWA sizes in one go
- Or manually resize with any image editor

---

## 3. Configure `vite-plugin-pwa` in `vite.config.ts`

```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // ... existing config
  plugins: [
    // ... existing plugins (vue, vuetify, vueI18n)
    VitePWA({
      registerType: 'prompt',  // Use 'prompt' to show the ReloadPrompt component (see step 6)
      manifest: {
        name: 'Torah Roll Helper',
        short_name: 'Torah Roll',
        description: 'Free Torah scroll rolling assistant for Gabbaim and Ba\'alei Kriah',
        theme_color: '#1976D2',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/torah_roll_helper/',
        start_url: '/torah_roll_helper/',
        categories: ['utilities', 'education'],
        icons: [
          {
            src: 'icon/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icon/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Torah Roll Helper on mobile'
          },
          {
            src: 'screenshots/desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Torah Roll Helper on desktop'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff2,json}']
      }
    })
  ]
})
```

**Important notes:**
- The `scope` and `start_url` must match the `base` in your Vite config (`/torah_roll_helper/`) since you deploy to GitHub Pages.
- `woff2` must be included in `globPatterns` because `@mdi/font` icons and the `ShlomosemiStam` Tikkun preview font use `.woff2` files. Without it, icons and Hebrew preview text can break offline.
- `includeAssets` is not needed for the current favicon/apple-touch-icon because those static `public/` files are already covered by `globPatterns`. Add `includeAssets` later only for assets Workbox cannot discover automatically.
- `registerType` is set to `'prompt'` — this is intentional. It pairs with the `ReloadPrompt.vue` component in step 6. If you set `'autoUpdate'` instead, the prompt component will never trigger (the SW updates silently). Choose one strategy:
  - `'prompt'` + ReloadPrompt component = user clicks "Update" to get new version
  - `'autoUpdate'` + no prompt component = silent background updates
- The `screenshots` array enables Android Chrome's "Rich Install UI" (Play Store-like carousel). You need to take actual screenshots of the app and place them in `public/screenshots/`. Adjust sizes to match your actual screenshots.
- The calendar is generated locally from `@hebcal/hdate` and `@hebcal/leyning`; there are no runtime `hebcal.com` calls to cache.
- Do not add `runtimeCaching` for Dicta. OCR/parallels should remain live-network features, and the app should show a clear offline message when they are unavailable.

---

## 4. Add meta tags to `index.html`

Add these inside `<head>`:

```html
<!-- PWA: dynamic theme color for light/dark system preference -->
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#1976D2">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121212">

<!-- PWA: iOS/Apple specific -->
<link rel="apple-touch-icon" href="/torah_roll_helper/icon/apple-touch-icon-180x180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Torah Roll">
```

Notes:
- **Dynamic theme-color** — Two `<meta name="theme-color">` tags with `media` queries make the mobile browser status bar react to the user's system light/dark preference. Update `#121212` if you later add a Vuetify dark theme with a different background.
- `apple-touch-icon` — Required for iOS to show your icon (not a generic screenshot) when added to home screen. Must be 180×180px.
- `apple-mobile-web-app-capable` — Tells Safari the app can run in standalone mode (no browser chrome).
- `apple-mobile-web-app-status-bar-style` — Use `"default"` for a normal status bar, or `"black-translucent"` for a full-bleed look.
- The app currently only has a light theme. If you add a dark theme later, make sure the dark `theme-color` matches your Vuetify dark theme's `background` color.

---

## 5. Add TypeScript types

In `env.d.ts` (or `tsconfig.json`), add the type reference so `virtual:pwa-register/vue` resolves:

```ts
/// <reference types="vite-plugin-pwa/vue" />
```

Or in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["vite/client", "vite-plugin-pwa/vue"]
  }
}
```

Prefer the triple-slash reference in `env.d.ts`/`src/vite-env.d.ts` when possible because it is additive. If you edit `tsconfig.json`, keep the existing `vite/client` entry; replacing it will break Vite's type resolution.

---

## 6. Create a "Reload Prompt" component (recommended)

Since `registerType` is set to `'prompt'` (step 3), the service worker will NOT auto-update. Instead, it waits for the user to confirm. This is the recommended approach because:
- iOS Safari is notoriously stubborn about holding onto old cached versions
- Users who added the app to their home screen rely entirely on this "Update" button to get new code/data
- It gives you control over when the update happens (avoiding mid-session disruptions)

Create `src/components/ReloadPrompt.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

const showOfflineReady = computed({
  get: () => offlineReady.value && !needRefresh.value,
  set: (value: boolean) => {
    if (!value) {
      offlineReady.value = false
    }
  }
})

const close = () => {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <v-snackbar v-model="showOfflineReady" :timeout="3000" color="success">
    App ready to work offline.
    <template #actions>
      <v-btn variant="text" @click="close">Close</v-btn>
    </template>
  </v-snackbar>

  <v-snackbar v-model="needRefresh" :timeout="-1" color="primary">
    New version available.
    <template #actions>
      <v-btn variant="text" @click="updateServiceWorker(true)">Update</v-btn>
      <v-btn variant="text" @click="close">Dismiss</v-btn>
    </template>
  </v-snackbar>
</template>
```

Include this component in `App.vue`. Make the update banner highly visible — especially for iOS home-screen users who have no other way to trigger a refresh of cached assets.

```vue
<template>
  <v-app>
    <nav-bar />
    <v-main>
      <router-view />
    </v-main>
    <ReloadPrompt />
  </v-app>
</template>

<script setup lang="ts">
import NavBar from './components/NavBar.vue'
import ReloadPrompt from './components/ReloadPrompt.vue'
</script>
```

In the real `App.vue`, place `<ReloadPrompt />` just before `</v-app>` so it sits at the app shell level without interfering with route content.

---

## 7. iOS-specific considerations

### 7a. Splash screens (Launch images)
iOS does not use the manifest `icons` for splash screens. It uses `<link rel="apple-touch-startup-image">` tags with specific media queries for each device size. This is optional but improves the experience.

Use [pwa-asset-generator](https://github.com/nicedoc/pwa-asset-generator) to auto-generate all required splash images and the corresponding `<link>` tags:

```bash
npx pwa-asset-generator public/icon/bright_mode.png public/icon/splash --splash-only --type png
```

### 7b. No install prompt on iOS
Unlike Android (which shows a native install banner), iOS Safari requires users to manually tap **Share → Add to Home Screen**. Consider adding an in-app banner/tooltip explaining this (relates to TODO 30).

### 7c. iOS limitations to be aware of
- No push notifications on iOS < 16.4 (supported from iOS 16.4+ for home screen apps)
- Service worker cache is limited to ~50MB on iOS
- iOS may purge service worker cache after ~14 days of inactivity
- No background sync on iOS
- `beforeinstallprompt` event does NOT fire on iOS Safari — you cannot detect installability programmatically

### 7d. iOS update cycle — critical gotcha
When you push a new version to GitHub Pages, iOS Safari can be extremely stubborn about holding onto the old cached version, even after the user closes and reopens the app from the home screen. This is why the `'prompt'` strategy (step 3) with a highly visible update banner (step 6) is essential. iOS home-screen users rely entirely on that "Update" button to fetch new routing logic or data files. Without it, they may be stuck on a stale version indefinitely.

---

## 8. Android-specific considerations

### 8a. Install prompt
Android Chrome fires the `beforeinstallprompt` event. You can intercept it to show a custom "Install app" button. This is optional — Chrome also shows its own mini-infobar.

### 8b. Maskable icons
Android uses adaptive icons. Without a maskable icon, your icon may appear with an ugly white background circle. Make sure to provide `purpose: "maskable"` icons with safe-zone padding.

### 8c. TWA (Trusted Web Activity)
Not needed for a simple PWA. Only relevant if you want to publish on the Play Store.

---

## 9. "Add to Home Screen" instructions for users (TODO 30)

Create an in-app guide (dialog or page) explaining how to install:

**iOS:**
1. Open in Safari (not Chrome/Firefox — they don't support PWA install on iOS)
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

**Android:**
1. Open in Chrome
2. Tap the three-dot menu (⋮)
3. Tap "Install app" or "Add to Home Screen"
4. Confirm

Consider showing this guide:
- As a dismissible banner on first visit (similar to the Gola banner pattern)
- Or as a button in the Settings dialog
- Only show on mobile (use `navigator.standalone` or `window.matchMedia('(display-mode: standalone)')` to hide it if already installed)

---

## 10. Persist user preferences with localStorage (TODO 29 + 31)

This is partially independent of PWA but complements it. The app already uses localStorage for tutorial state (`src/composables/tutorials.ts`). Extend this pattern to persist:

- [ ] Language preference
- [ ] Gola/Israel setting
- [ ] Torah scroll layout (torahType)
- [ ] Any other settings from the options store

**Recommended approach — `pinia-plugin-persistedstate`:**

Since the app uses Pinia (`src/stores/options.ts`), the cleanest solution is to install `pinia-plugin-persistedstate`. It automatically syncs your store state to localStorage without manual `getItem`/`setItem` calls:

```bash
npm install pinia-plugin-persistedstate
```

```ts
// src/main.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
```

```ts
// src/stores/options.ts
const useOptionsStore = defineStore('options', () => {
  // ... existing refs
}, {
  persist: true  // That's it — all state is now persisted
})
```

Important product decision: `persist: true` persists the entire options store, including `fromPage` and `toPage`. That means the scroll will reopen at the last selected position on the next app load. If that is intentional, keep `persist: true`. If only long-term settings should persist and the current scroll position should reset each session, use `pick`:

```ts
// src/stores/options.ts
const useOptionsStore = defineStore('options', () => {
  // ... existing refs
}, {
  persist: {
    pick: ['isInGola', 'nusach', 'torahType']
    // fromPage and toPage are NOT persisted
  }
})
```

**Alternative — `@vueuse/core`'s `useStorage`:**

If you prefer a composable-level approach (without a Pinia plugin), `useStorage` from `@vueuse/core` creates a reactive ref that auto-syncs to localStorage. Useful for one-off values outside of stores.

**Wiring persisted preferences to i18n and Vuetify:**

Language currently lives entirely on the `vue-i18n` instance. `src/components/LanguageSelection.vue` mutates `i18n.locale.value` directly when the user changes language.

Recommended path for the current code: persist the locale directly in localStorage and initialize `vue-i18n` from that value before `app.mount('#app')`. This avoids a Pinia refactor.

Before wiring this, extract the localStorage key to a shared constant so `i18n.ts` and `LanguageSelection.vue` cannot drift:

```ts
// src/composables/storageKeys.ts
const LANGUAGE_STORAGE_KEY = 'torah-roll-helper:language'

export { LANGUAGE_STORAGE_KEY }
```

```ts
// src/plugins/i18n.ts
import { LANGUAGE_STORAGE_KEY } from '@/composables/storageKeys'

const storedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY)

const i18n = createI18n({
  legacy: false,
  locale: storedLocale || import.meta.env.VITE_APP_I18N_LOCALE || 'en',
  fallbackLocale: import.meta.env.VITE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages
})
```

```ts
// src/components/LanguageSelection.vue
import { LANGUAGE_STORAGE_KEY } from '@/composables/storageKeys'

const onLocaleChanged = (nextLocale: string | null) => {
  if (!nextLocale || nextLocale === i18n.locale.value) return

  const previousLocale = i18n.locale.value
  i18n.locale.value = nextLocale
  localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale)
  trackLanguageChange(previousLocale, nextLocale)
}
```

If you prefer to add `language` to the Pinia options store instead, treat it as a two-part refactor:
- Add a `language` ref and `changeLanguage` action to `useOptionsStore`.
- Update `LanguageSelection.vue` to call `changeLanguage(nextLocale)` instead of mutating `i18n.locale.value` directly.

Then wire the store into `vue-i18n` on app startup after Pinia is installed and before mounting:

```ts
// src/main.ts
import { useOptionsStore } from '@/stores/options'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)

const optionsStore = useOptionsStore()
i18n.global.locale.value = optionsStore.language
```

Without the `LanguageSelection.vue` change, Pinia and `vue-i18n` will drift out of sync as soon as the user changes language.

Wire any future Vuetify theme preference the same way, so the correct language/theme renders on the very first frame (including offline).

On app load, if settings differ from defaults, optionally show a brief toast (auto-dismiss) informing the user which non-default settings are active. If only language differs, skip the toast (the user will see it by themselves).

---

## 11. Offline support strategy

With `vite-plugin-pwa` and Workbox, the app's static assets (JS, CSS, HTML, fonts, JSON data files) are precached automatically. This means the core app works offline after the first visit.

**What works offline:**
- All UI and navigation
- The `real_db.json`, `page_first_lines.json`, `target_pages.json` data (precached)
- Rolling calculations (pure client-side logic)

**What does NOT work offline:**
- Dicta OCR/parallels search — requires network, show a clear offline message
- Tikkun.io preview links — external site, cannot cache

---

## 12. Testing the PWA

### Local testing
```bash
npm run build
npm run preview
```
The service worker only activates in production builds. Use Chrome DevTools → Application tab to inspect:
- Manifest detection
- Service worker registration
- Cache storage

### Lighthouse audit
Run a Lighthouse PWA audit in Chrome DevTools to verify all requirements are met. Target a score of 100 on the PWA category.

Do not rely on `http://localhost` for the final PWA score. Some PWA checks require a production build and secure context behavior. Use `npm run build` + `npm run preview`, then test `http://127.0.0.1:PORT` locally, or deploy to a staging URL over HTTPS.

### Device testing
- **Android**: Test in Chrome, check install prompt appears, verify icon and splash
- **iOS**: Test in Safari, verify Add to Home Screen works, check icon displays correctly, verify standalone mode works

---

## 13. GitHub Pages deployment notes

Since the app deploys to `https://samlizard.github.io/torah_roll_helper/`:
- The `base` in `vite.config.ts` is already `/torah_roll_helper/` ✅
- The manifest `scope` and `start_url` must also be `/torah_roll_helper/`
- The `apple-touch-icon` href must include the base path: `/torah_roll_helper/icon/apple-touch-icon-180x180.png`
- `vite-plugin-pwa` automatically respects the Vite `base` config for manifest icon paths

---

## 14. Advanced — "Native feel" enhancements

These are more complex tasks that go beyond the basic PWA setup. They make the app feel truly native but require more effort.

### 14a. Rich Install UI (Android Chrome)

Android Chrome supports a "Rich Install UI" that mimics the Google Play Store experience with a swipeable screenshot carousel. To trigger it:

1. Take screenshots of the app (mobile + desktop)
2. Place them in `public/screenshots/` (e.g. `mobile.png` at 390×844, `desktop.png` at 1280×720)
3. Add the `screenshots` array to the manifest (already included in step 3 config above)
4. Add `categories: ['utilities', 'education']` to the manifest (already included above)

The combination of `description` + `screenshots` + `categories` triggers the rich UI instead of the basic install banner.

### 14b. Custom "Install App" button (intercepting `beforeinstallprompt`)

On Android, you can intercept the browser's install prompt and show your own custom button instead:

```ts
// src/composables/installPrompt.ts
import { ref } from 'vue'

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const canInstall = ref(false)

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent
  canInstall.value = true
})

const useInstallPrompt = () => {
  const install = async () => {
    if (!deferredPrompt.value) return
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      canInstall.value = false
    }
    deferredPrompt.value = null
  }

  return { canInstall, install }
}

export { useInstallPrompt }
```

Then show an "Install" button in the NavBar or Settings when `canInstall` is true. This does NOT work on iOS — for iOS, show the manual instructions (step 9).

### 14c. Detect standalone mode (hide install prompts when already installed)

```ts
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as any).standalone === true  // iOS Safari
```

Use this to hide install banners/instructions when the user is already running the app from their home screen.

### 14d. Periodic service worker update checks

For users who keep the app open for long periods (e.g. a Gabbai during Shabbat morning), add periodic update checks:

```ts
import { useRegisterSW } from 'virtual:pwa-register/vue'

const intervalMS = 60 * 60 * 1000 // check every hour

useRegisterSW({
  onRegistered(r) {
    r && setInterval(() => { r.update() }, intervalMS)
  }
})
```

This ensures the "Update available" prompt appears even if the user never navigates away.

### 14e. Offline-aware UI feedback

Show a subtle indicator when the app is offline so users know network-dependent features (Dicta OCR/parallels) won't work:

```ts
import { ref, onMounted, onUnmounted } from 'vue'

const useOnlineStatus = () => {
  const isOnline = ref(navigator.onLine)
  const onOnline = () => { isOnline.value = true }
  const onOffline = () => { isOnline.value = false }

  onMounted(() => {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
  })
  onUnmounted(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  })

  return { isOnline }
}

export { useOnlineStatus }
```

Use this to disable or grey out the camera/OCR button and show a small chip like "Offline — core features available" in the NavBar.

Note: `navigator.onLine` reflects network interface connectivity, not internet access. A device on WiFi with no internet will appear online. For this app that is acceptable because Dicta failures are already handled by the existing `dictaFlowState` error state.

### 14f. iOS splash screens (all device sizes)

Generating splash screens for every iOS device is tedious but gives a polished launch experience. Use:

```bash
npx pwa-asset-generator public/icon/bright_mode.png public/icon/splash \
  --splash-only --type png --background "#ffffff"
```

This generates ~20 images and outputs the `<link>` tags to paste into `index.html`. Each tag targets a specific device resolution via media queries.

### 14g. App shortcuts (manifest)

Add quick-action shortcuts that appear on long-press of the app icon (Android):

```json
"shortcuts": [
  {
    "name": "Choose reading",
    "short_name": "Reading",
    "url": "/torah_roll_helper/",
    "icons": [{ "src": "icon/pwa-192x192.png", "sizes": "192x192" }]
  }
]
```

This is optional and only useful if the app has multiple entry points.

---

## Summary checklist

### Core (must-have for a working PWA)
- [x] Install `vite-plugin-pwa` as dev dependency
- [x] Generate all required icon sizes from `public/icon/bright_mode.png`
- [x] Generate maskable icon variants (with safe-zone padding)
- [x] Generate `apple-touch-icon-180x180.png`
- [x] Replace `favicon.ico` with one generated from the same source image (so tab icon = home screen icon)
- [ ] Add `VitePWA()` plugin to `vite.config.ts` with manifest config
- [ ] Add PWA meta tags to `index.html` (theme-color with light/dark, apple-touch-icon, apple-mobile-web-app-*)
- [ ] Add TypeScript type reference for `vite-plugin-pwa/vue`
- [ ] Create `ReloadPrompt.vue` component for update notifications
- [ ] Add `<ReloadPrompt />` to `App.vue` and import it
- [ ] Keep external API calls out of Workbox runtime caching unless a future feature explicitly needs cached API responses
- [ ] Test with Lighthouse PWA audit
- [ ] Test on real Android device (Chrome)
- [ ] Test on real iOS device (Safari)
- [ ] Verify icons display correctly on both platforms
- [ ] Verify app works offline after first load

### Complementary (high value, partially independent of PWA)
- [ ] Persist user settings via `pinia-plugin-persistedstate` (language, gola, torahType)
- [ ] Wire persisted language to vue-i18n on first frame
- [ ] Add "Add to Home Screen" instructions UI for iOS/Android users

### Advanced (native feel, do after core works)
- [ ] Take app screenshots and add to manifest for Rich Install UI
- [ ] Add custom "Install App" button (Android `beforeinstallprompt`)
- [ ] Detect standalone mode to hide install prompts
- [ ] Add periodic SW update checks (hourly)
- [ ] Add offline-aware UI feedback (disable OCR button, show chip)
- [ ] Generate iOS splash screens for all device sizes
- [ ] (Optional) Add manifest shortcuts for long-press actions
