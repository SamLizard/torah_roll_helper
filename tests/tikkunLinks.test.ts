import { describe, expect, it } from 'vitest';
import { getTikkunRouteForTarget, resolveTikkunLink, toTikkunUrl } from '../src/composables/tikkunLinks';
import type { TikkunLinkTarget } from '../src/composables/tikkunLinks';

const createTarget = (overrides: Partial<TikkunLinkTarget>): TikkunLinkTarget => ({
  key: 'bereshit',
  type: 'parasha',
  specific: 'both',
  ref: {
    book: 1,
    chapter: 1,
    verse: 1,
    page: { '245': 1, '248': 1 },
  },
  ...overrides,
});

describe('tikkun link generation', () => {
  it('uses the first parasha slug for paired parashiot', () => {
    const route = getTikkunRouteForTarget(createTarget({
      key: 'matot::masei',
      ref: {
        book: 4,
        chapter: 30,
        verse: 2,
        page: { '245': 192, '248': 195 },
      },
    }));

    expect(route).toEqual({
      route: 'p',
      slug: 'matot',
    });
  });

  it('falls back to ref mode for the four parashiot special readings', () => {
    const route = getTikkunRouteForTarget(createTarget({
      key: 'hachodesh',
      type: 'holyday',
      ref: {
        book: 2,
        chapter: 12,
        verse: 1,
        page: { '245': 73, '248': 75 },
      },
    }));

    expect(route).toBeNull();
  });

  it('uses a supported holiday slug only when the start ref matches', () => {
    const route = getTikkunRouteForTarget(createTarget({
      key: 'sukkot-2',
      type: 'holyday',
      specific: 'gola',
      ref: {
        book: 3,
        chapter: 22,
        verse: 26,
        page: { '245': 139, '248': 142 },
      },
    }));

    expect(route).toEqual({
      route: 'h',
      slug: 'sukkot-2',
    });
  });

  it('falls back to ref mode when the same holiday key points to a different ref', () => {
    const route = getTikkunRouteForTarget(createTarget({
      key: 'sukkot-2',
      type: 'holyday',
      specific: 'israel',
      ref: {
        book: 4,
        chapter: 29,
        verse: 17,
        page: { '245': 190, '248': 194 },
      },
    }));

    expect(route).toBeNull();
  });

  it('maps local holiday ids to the tikkun slug when needed', () => {
    const url = toTikkunUrl(createTarget({
      key: 'simchat-torah-a',
      type: 'holyday',
      ref: {
        book: 5,
        chapter: 33,
        verse: 1,
        page: { '245': 244, '248': 247 },
      },
    }));

    expect(url).toBe('https://tikkun.io/#/h/simchat-torah');
  });

  it('keeps the non-shabbat Yom Tov variant on ref mode when its start ref differs from tikkun', () => {
    const route = getTikkunRouteForTarget(createTarget({
      key: 'shavuot-2',
      type: 'holyday',
      specific: 'gola',
      ref: {
        book: 5,
        chapter: 15,
        verse: 19,
        page: { '245': 222, '248': 225 },
      },
    }));

    expect(route).toEqual({
      route: 'h',
      slug: 'shavuot-2',
    });
  });

  it('uses the base tikkun slug for shabbat-suffixed Yom Tov variants', () => {
    const url = toTikkunUrl(createTarget({
      key: 'shavuot-2-shabbat',
      type: 'holyday',
      specific: 'gola',
      ref: {
        book: 5,
        chapter: 14,
        verse: 22,
        page: { '245': 220, '248': 223 },
      },
    }));

    expect(url).toBe('https://tikkun.io/#/h/shavuot-2');
  });

  it('applies the same base-slug rule to other shabbat-suffixed holidays', () => {
    const url = toTikkunUrl(createTarget({
      key: 'pesach-1-shabbat',
      type: 'holyday',
      ref: {
        book: 2,
        chapter: 12,
        verse: 14,
        page: { '245': 74, '248': 75 },
      },
    }));

    expect(url).toBe('https://tikkun.io/#/h/pesach-1');
  });

  it('resolves reading links before ref fallback', () => {
    const link = resolveTikkunLink({
      providerSelection: 'auto',
      layoutKey: '245',
      target: createTarget({ key: 'noach' }),
      ref: { book: 1, chapter: 9, verse: 1 },
      page: 4,
    });

    expect(link).toMatchObject({
      url: 'https://tikkun.io/#/p/noach',
      source: 'reading',
      providerId: 'tikkun_io',
      hasLayoutWarning: false,
    });
  });

  it('keeps Auto reading links on tikkun.io even for another active layout', () => {
    const link = resolveTikkunLink({
      providerSelection: 'auto',
      layoutKey: '226',
      target: createTarget({ key: 'noach' }),
      ref: { book: 1, chapter: 9, verse: 1 },
      page: 4,
    });

    expect(link).toMatchObject({
      url: 'https://tikkun.io/#/p/noach',
      source: 'reading',
      providerId: 'tikkun_io',
      hasLayoutWarning: true,
    });
  });

  it('uses ref fallback when the provider has no reading route for the target', () => {
    const link = resolveTikkunLink({
      providerSelection: 'tikkun_io',
      layoutKey: '245',
      target: createTarget({ key: 'hachodesh' }),
      ref: { book: 2, chapter: 12, verse: 1 },
      page: 73,
    });

    expect(link).toMatchObject({
      url: 'https://tikkun.io/#/r/2-12-1',
      source: 'ref',
      hasLayoutWarning: false,
    });
  });

  it('uses tikkun.io as the Auto ref fallback on the 245 layout', () => {
    const link = resolveTikkunLink({
      providerSelection: 'auto',
      layoutKey: '245',
      target: createTarget({ key: 'hachodesh' }),
      ref: { book: 2, chapter: 12, verse: 1 },
      page: 73,
    });

    expect(link).toMatchObject({
      url: 'https://tikkun.io/#/r/2-12-1',
      source: 'ref',
      providerId: 'tikkun_io',
      providerSupportedLayoutKeys: ['245'],
      selectedLayoutKey: '245',
      hasLayoutWarning: false,
    });
  });

  it('uses Sefaria as the Auto ref fallback outside the 245 layout', () => {
    const link = resolveTikkunLink({
      providerSelection: 'auto',
      layoutKey: '226',
      target: createTarget({ key: 'hachodesh' }),
      ref: { book: 2, chapter: 12, verse: 1 },
      page: 67,
    });

    expect(link).toMatchObject({
      url: 'https://www.sefaria.org/Exodus.12.1',
      source: 'ref',
      providerId: 'sefaria',
      providerSupportedLayoutKeys: null,
      selectedLayoutKey: '226',
      hasLayoutWarning: false,
    });
  });

  it('uses Sefaria refs directly when Sefaria is explicitly selected', () => {
    const link = resolveTikkunLink({
      providerSelection: 'sefaria',
      layoutKey: '245',
      target: createTarget({ key: 'noach' }),
      ref: { book: 1, chapter: 9, verse: 1 },
      page: 4,
    });

    expect(link).toMatchObject({
      url: 'https://www.sefaria.org/Genesis.9.1',
      source: 'ref',
      providerId: 'sefaria',
      hasLayoutWarning: false,
    });
  });

  it('warns when a ref opens in a provider with a different page layout', () => {
    const link = resolveTikkunLink({
      providerSelection: 'tikkun_io',
      layoutKey: '226',
      ref: { book: 2, chapter: 12, verse: 1 },
      page: 67,
    });

    expect(link).toMatchObject({
      url: 'https://tikkun.io/#/r/2-12-1',
      source: 'ref',
      providerSupportedLayoutKeys: ['245'],
      selectedLayoutKey: '226',
      hasLayoutWarning: true,
    });
  });
});
