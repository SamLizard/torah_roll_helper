import type { TikkunLinkTarget, TikkunProvider, TikkunRoute } from './types';
import { createVerse, isSameVerse, joinUrlParts, supportsSpecific, type SpecificSupport } from './utils';
import type { Verse } from '@/types';

interface TikkunHolidayRouteDefinition {
  key: string;
  slug: string;
  specific: SpecificSupport;
  start: Verse;
}

const PAIRED_PARASHA_READING_ID_SEPARATOR = '::';
const SHABBAT_KEY_SUFFIX = '-shabbat';
const FOUR_PARASHIOT_USING_REF = new Set(['shekalim', 'zachor', 'parah', 'hachodesh', 'hahodesh']);

const TIKKUN_IO_HOLIDAY_ROUTES: TikkunHolidayRouteDefinition[] = [
  { key: 'rosh-chodesh', slug: 'rosh-chodesh', specific: 'both', start: createVerse(4, 28, 1) },
  { key: 'rosh-1', slug: 'rosh-1', specific: 'both', start: createVerse(1, 21, 1) },
  { key: 'rosh-2', slug: 'rosh-2', specific: 'both', start: createVerse(1, 22, 1) },
  { key: 'yom-kippur', slug: 'yom-kippur', specific: 'both', start: createVerse(3, 16, 1) },
  { key: 'sukkot-1', slug: 'sukkot-1', specific: 'both', start: createVerse(3, 22, 26) },
  { key: 'sukkot-2', slug: 'sukkot-2', specific: 'both', start: createVerse(3, 22, 26) },
  { key: 'sukkot-3', slug: 'sukkot-3', specific: 'both', start: createVerse(4, 29, 17) },
  { key: 'sukkot-4', slug: 'sukkot-4', specific: 'both', start: createVerse(4, 29, 20) },
  { key: 'sukkot-5', slug: 'sukkot-5', specific: 'both', start: createVerse(4, 29, 23) },
  { key: 'sukkot-6', slug: 'sukkot-6', specific: 'both', start: createVerse(4, 29, 26) },
  { key: 'sukkot-7', slug: 'sukkot-7', specific: 'both', start: createVerse(4, 29, 26) },
  { key: 'sukkot-shabbat-chol-hamoed', slug: 'sukkot-shabbat-chol-hamoed', specific: 'both', start: createVerse(2, 33, 12) },
  { key: 'shmini-atzeret', slug: 'shmini-atzeret', specific: 'both', start: createVerse(5, 14, 22) },
  { key: 'simchat-torah-a', slug: 'simchat-torah', specific: 'both', start: createVerse(5, 33, 1) },
  { key: 'chanukah-1', slug: 'chanukah-1', specific: 'both', start: createVerse(4, 7, 1) },
  { key: 'chanukah-2', slug: 'chanukah-2', specific: 'both', start: createVerse(4, 7, 18) },
  { key: 'chanukah-3', slug: 'chanukah-3', specific: 'both', start: createVerse(4, 7, 24) },
  { key: 'chanukah-4', slug: 'chanukah-4', specific: 'both', start: createVerse(4, 7, 30) },
  { key: 'chanukah-5', slug: 'chanukah-5', specific: 'both', start: createVerse(4, 7, 36) },
  { key: 'chanukah-7', slug: 'chanukah-7', specific: 'both', start: createVerse(4, 7, 48) },
  { key: 'chanukah-8', slug: 'chanukah-8', specific: 'both', start: createVerse(4, 7, 54) },
  { key: 'purim', slug: 'purim', specific: 'both', start: createVerse(2, 17, 8) },
  { key: 'taanit-tzibur', slug: 'taanit-tzibur', specific: 'both', start: createVerse(2, 32, 11) },
  { key: 'pesach-1', slug: 'pesach-1', specific: 'both', start: createVerse(2, 12, 21) },
  { key: 'pesach-2', slug: 'pesach-2', specific: 'both', start: createVerse(3, 22, 26) },
  { key: 'pesach-3', slug: 'pesach-3', specific: 'both', start: createVerse(2, 13, 1) },
  { key: 'pesach-4', slug: 'pesach-4', specific: 'both', start: createVerse(2, 22, 24) },
  { key: 'pesach-5', slug: 'pesach-5', specific: 'both', start: createVerse(2, 34, 1) },
  { key: 'pesach-6', slug: 'pesach-6', specific: 'both', start: createVerse(4, 9, 1) },
  { key: 'pesach-shabbat-chol-hamoed', slug: 'pesach-shabbat-chol-hamoed', specific: 'both', start: createVerse(2, 33, 12) },
  { key: 'pesach-7', slug: 'pesach-7', specific: 'both', start: createVerse(2, 13, 17) },
  { key: 'pesach-8', slug: 'pesach-8', specific: 'gola', start: createVerse(5, 15, 19) },
  { key: 'shavuot-1', slug: 'shavuot-1', specific: 'both', start: createVerse(2, 19, 1) },
  { key: 'shavuot-2', slug: 'shavuot-2', specific: 'gola', start: createVerse(5, 15, 19) },
  { key: 'tisha-bav', slug: 'tisha-bav', specific: 'both', start: createVerse(5, 4, 25) },
];

const normalizeLegacyTikkunSlug = (key: string) => {
  const normalizedKey = key === 'hachodesh' ? 'hahodesh' : key;
  return normalizedKey.replace(/_/g, '-');
};

const getParashaSlug = (key: string) => {
  const [firstParashaKey] = key.split(PAIRED_PARASHA_READING_ID_SEPARATOR);
  return normalizeLegacyTikkunSlug(firstParashaKey);
};

const getExactHolidayRoute = (target: TikkunLinkTarget) =>
  TIKKUN_IO_HOLIDAY_ROUTES.find((route) =>
    route.key === target.key && supportsSpecific(route.specific, target.specific) && isSameVerse(target.ref, route.start)
  ) ?? null;

const getShabbatFallbackHolidayRoute = (target: TikkunLinkTarget) => {
  if (!target.key.endsWith(SHABBAT_KEY_SUFFIX)) return null;
  const baseKey = target.key.slice(0, -SHABBAT_KEY_SUFFIX.length);

  return TIKKUN_IO_HOLIDAY_ROUTES.find((route) =>
    route.key === baseKey && supportsSpecific(route.specific, target.specific)
  ) ?? null;
};

const getTikkunRouteForTarget = (target: TikkunLinkTarget | null): TikkunRoute | null => {
  if (!target) return null;

  if (target.type === 'parasha') {
    if (FOUR_PARASHIOT_USING_REF.has(target.key)) return null;
    return { route: 'p', slug: getParashaSlug(target.key) };
  }

  const matchingHolidayRoute = getExactHolidayRoute(target) ?? getShabbatFallbackHolidayRoute(target);
  return matchingHolidayRoute ? { route: 'h', slug: matchingHolidayRoute.slug } : null;
};

const getReadingUrl = (target: TikkunLinkTarget | null) => {
  const route = getTikkunRouteForTarget(target);
  return route ? `https://tikkun.io/#/${route.route}/${route.slug}` : null;
};

const getRefUrl = (ref: Verse | null) =>
  ref ? joinUrlParts('https://tikkun.io/#/r', `${ref.book}-${ref.chapter}-${ref.verse}`) : null;

const getPageUrl = () => null;

const tikkunIoProvider: TikkunProvider = {
  id: 'tikkun_io',
  nameKey: 'settings.tikkunProviders.tikkun_io.name',
  descriptionKey: 'settings.tikkunProviders.tikkun_io.description',
  supportedLayoutKeys: ['245'],
  capabilities: {
    readings: true,
    refs: true,
    pages: false,
  },
  getReadingUrl,
  getRefUrl,
  getPageUrl,
};

export { getPageUrl, getReadingUrl, getRefUrl, getTikkunRouteForTarget, tikkunIoProvider };