# Add an online tikkun provider

Online tikkun providers are configured in code, not by end users. This keeps URL
generation reviewable, translated, and safe for the PWA/offline-first app.

Each provider lives in its own file under
[`src/composables/tikkunProviders`](../../src/composables/tikkunProviders). The
current providers are
[`tikkunIo.ts`](../../src/composables/tikkunProviders/tikkunIo.ts) and
[`sefaria.ts`](../../src/composables/tikkunProviders/sefaria.ts).

## Provider contract

Every provider file should expose the same three URL builder method names:

```ts
const getReadingUrl = (target: TikkunLinkTarget | null) => string | null;
const getRefUrl = (ref: Verse | null) => string | null;
const getPageUrl = (page: number | null, layoutKey: string) => string | null;
```

Return `null` when the provider cannot build a trustworthy link for that input.
The resolver tries them in this order:

1. `getReadingUrl` — preferred, because it opens the provider's reading page.
2. `getRefUrl` — fallback when the reading is not available by provider slug.
3. `getPageUrl` — fallback for page-only providers, only when the layout matches.

This order is important: if a provider has a real parasha/holiday route, use it
before a direct reference. Direct references are only a fallback.

In Auto mode, the resolver may combine providers: it tries reading links first
(currently tikkun.io), then direct refs from a provider compatible with the active
layout, then page links. This means the 245 layout uses tikkun.io for both
readings and refs, while other layouts still use tikkun.io for named readings and
fall back to Sefaria for reference-only links.

## Add the provider file

Create `src/composables/tikkunProviders/<providerId>.ts` and export a provider
object:

```ts
import type { TikkunLinkTarget, TikkunProvider } from './types';
import { joinUrlParts } from './utils';
import type { Verse } from '@/types';

const getReadingUrl = (target: TikkunLinkTarget | null) => {
  if (!target) return null;
  return null;
};

const getRefUrl = (ref: Verse | null) => {
  if (!ref) return null;
  return joinUrlParts('https://example.com/ref', ref.book, ref.chapter, ref.verse);
};

const getPageUrl = (page: number | null, layoutKey: string) => {
  if (page === null) return null;
  return null;
};

const exampleProvider: TikkunProvider = {
  id: 'example_provider',
  nameKey: 'settings.tikkunProviders.example_provider.name',
  descriptionKey: 'settings.tikkunProviders.example_provider.description',
  supportedLayoutKeys: null,
  capabilities: {
    readings: false,
    refs: false,
    pages: false,
  },
  getReadingUrl,
  getRefUrl,
  getPageUrl,
};

export { exampleProvider, getPageUrl, getReadingUrl, getRefUrl };
```

Keep the file focused. If a provider needs a large route map, keep helper data in
that provider file or a provider-specific helper next to it.

Shared helpers live in
[`utils.ts`](../../src/composables/tikkunProviders/utils.ts). Reuse them for
common provider work such as creating `Verse` objects, comparing refs, checking
Israel/Gola support, and joining URL path parts.

## Capabilities and layouts

Set capabilities honestly:

- `readings`: the provider can open named parasha/holiday pages.
- `refs`: the provider can open an exact book/chapter/verse.
- `pages`: the provider can open a page number in a known layout.

Set `supportedLayoutKeys` to one of these:

- `null` when the provider is layout-agnostic.
- `['245']`, `['226']`, etc. when the provider displays pages from specific klaf
  layouts.

The app warns users when the selected scroll layout differs from the provider's
layout. This warning is shown even for a direct ref link: the verse is correct,
but the online page may start and end at different places than the user's scroll.

## Register the provider

1. Add the provider id to `TikkunProviderId` in
   [`types.ts`](../../src/composables/tikkunProviders/types.ts).
2. Import the provider in
   [`index.ts`](../../src/composables/tikkunProviders/index.ts).
3. Add it to `TIKKUN_PROVIDERS`.
4. Add locale keys under `settings.tikkunProviders.<providerId>` in every file in
   [`src/locales`](../../src/locales).

The Settings dialog and saved-settings banner read from the registry, so no new
component wiring should be needed for a normal provider.

## Tests

Update [`tests/tikkunLinks.test.ts`](../../tests/tikkunLinks.test.ts):

- Existing providers should keep their current URLs.
- Reading links should win over ref links.
- Ref fallback should work when the provider supports refs.
- Page links should be disabled or return `null` for the wrong layout.
- Layout-bound providers should produce a layout warning when the active layout
  differs from `supportedLayoutKeys`.

Before opening a PR, run:

```bash
npm test -- --run tikkunLinks
npm run type-check
```