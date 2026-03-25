import { describe, expect, it } from 'vitest';
import { getTikkunRouteForTarget, toTikkunUrl } from '../src/composables/tikkunLinks';
import type { TikkunLinkTarget } from '../src/composables/tikkunLinks';

const createTarget = (overrides: Partial<TikkunLinkTarget>): TikkunLinkTarget => ({
  key: 'bereshit',
  type: 'parasha',
  specific: 'both',
  ref: {
    book: 1,
    chapter: 1,
    verse: 1,
    page: 1,
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
        page: 192,
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
        page: 73,
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
        page: 139,
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
        page: 190,
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
        page: 244,
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
        page: 222,
      },
    }));

    expect(route).toBeNull();
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
        page: 220,
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
        page: 74,
      },
    }));

    expect(url).toBe('https://tikkun.io/#/h/pesach-1');
  });
});
