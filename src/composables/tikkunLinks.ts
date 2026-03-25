import type { TargetSpecific, TargetType } from '@/composables/readingTargets';
import type { TorahRef, Verse } from '@/types';

interface TikkunLinkTarget {
  key: string;
  type: TargetType;
  specific: TargetSpecific;
  ref: TorahRef;
}

interface TikkunRoute {
  route: 'p' | 'h';
  slug: string;
}

interface TikkunHolidayRouteDefinition {
  key: string;
  slug: string;
  specific: 'both' | 'gola';
  start: Verse;
}

const PAIRED_PARASHA_READING_ID_SEPARATOR = '::';
const SHABBAT_KEY_SUFFIX = '-shabbat';
const FOUR_PARASHIOT_USING_REF = new Set(['shekalim', 'zachor', 'parah', 'hachodesh', 'hahodesh']);

const verse = (book: number, chapter: number, line: number): Verse => ({
  book,
  chapter,
  verse: line,
});

const TIKKUN_IO_HOLIDAY_ROUTES: TikkunHolidayRouteDefinition[] = [
  { key: 'rosh-chodesh', slug: 'rosh-chodesh', specific: 'both', start: verse(4, 28, 1) },
  { key: 'rosh-1', slug: 'rosh-1', specific: 'both', start: verse(1, 21, 1) },
  { key: 'rosh-2', slug: 'rosh-2', specific: 'both', start: verse(1, 22, 1) },
  { key: 'yom-kippur', slug: 'yom-kippur', specific: 'both', start: verse(3, 16, 1) },
  { key: 'sukkot-1', slug: 'sukkot-1', specific: 'both', start: verse(3, 22, 26) },
  { key: 'sukkot-2', slug: 'sukkot-2', specific: 'both', start: verse(3, 22, 26) },
  { key: 'sukkot-3', slug: 'sukkot-3', specific: 'both', start: verse(4, 29, 17) },
  { key: 'sukkot-4', slug: 'sukkot-4', specific: 'both', start: verse(4, 29, 20) },
  { key: 'sukkot-5', slug: 'sukkot-5', specific: 'both', start: verse(4, 29, 23) },
  { key: 'sukkot-6', slug: 'sukkot-6', specific: 'both', start: verse(4, 29, 26) },
  { key: 'sukkot-7', slug: 'sukkot-7', specific: 'both', start: verse(4, 29, 26) },
  { key: 'sukkot-shabbat-chol-hamoed', slug: 'sukkot-shabbat-chol-hamoed', specific: 'both', start: verse(2, 33, 12) },
  { key: 'shmini-atzeret', slug: 'shmini-atzeret', specific: 'both', start: verse(5, 14, 22) },
  { key: 'simchat-torah-a', slug: 'simchat-torah', specific: 'both', start: verse(5, 33, 1) },
  { key: 'chanukah-1', slug: 'chanukah-1', specific: 'both', start: verse(4, 7, 1) },
  { key: 'chanukah-2', slug: 'chanukah-2', specific: 'both', start: verse(4, 7, 18) },
  { key: 'chanukah-3', slug: 'chanukah-3', specific: 'both', start: verse(4, 7, 24) },
  { key: 'chanukah-4', slug: 'chanukah-4', specific: 'both', start: verse(4, 7, 30) },
  { key: 'chanukah-5', slug: 'chanukah-5', specific: 'both', start: verse(4, 7, 36) },
  { key: 'chanukah-7', slug: 'chanukah-7', specific: 'both', start: verse(4, 7, 48) },
  { key: 'chanukah-8', slug: 'chanukah-8', specific: 'both', start: verse(4, 7, 54) },
  { key: 'purim', slug: 'purim', specific: 'both', start: verse(2, 17, 8) },
  { key: 'taanit-tzibur', slug: 'taanit-tzibur', specific: 'both', start: verse(2, 32, 11) },
  { key: 'pesach-1', slug: 'pesach-1', specific: 'both', start: verse(2, 12, 21) },
  { key: 'pesach-2', slug: 'pesach-2', specific: 'both', start: verse(3, 22, 26) },
  { key: 'pesach-3', slug: 'pesach-3', specific: 'both', start: verse(2, 13, 1) },
  { key: 'pesach-4', slug: 'pesach-4', specific: 'both', start: verse(2, 22, 24) },
  { key: 'pesach-5', slug: 'pesach-5', specific: 'both', start: verse(2, 34, 1) },
  { key: 'pesach-6', slug: 'pesach-6', specific: 'both', start: verse(4, 9, 1) },
  { key: 'pesach-shabbat-chol-hamoed', slug: 'pesach-shabbat-chol-hamoed', specific: 'both', start: verse(2, 33, 12) },
  { key: 'pesach-7', slug: 'pesach-7', specific: 'both', start: verse(2, 13, 17) },
  { key: 'pesach-8', slug: 'pesach-8', specific: 'gola', start: verse(5, 15, 19) },
  { key: 'shavuot-1', slug: 'shavuot-1', specific: 'both', start: verse(2, 19, 1) },
  { key: 'shavuot-2', slug: 'shavuot-2', specific: 'gola', start: verse(5, 15, 19) },
  { key: 'tisha-bav', slug: 'tisha-bav', specific: 'both', start: verse(5, 4, 25) },
];

const normalizeLegacyTikkunSlug = (key: string) => {
  const normalizedKey = key === 'hachodesh' ? 'hahodesh' : key;
  return normalizedKey.replace(/_/g, '-');
};

const toRefUrl = (ref: Verse) =>
  `https://tikkun.io/#/r/${ref.book}-${ref.chapter}-${ref.verse}`;

const isSameStartRef = (left: Pick<TorahRef, 'book' | 'chapter' | 'verse'>, right: Verse) =>
  left.book === right.book &&
  left.chapter === right.chapter &&
  left.verse === right.verse;

const supportsSpecific = (
  supportedSpecific: TikkunHolidayRouteDefinition['specific'],
  targetSpecific: TargetSpecific
) => supportedSpecific === 'both' || supportedSpecific === targetSpecific;

const getParashaSlug = (key: string) => {
  const [firstParashaKey] = key.split(PAIRED_PARASHA_READING_ID_SEPARATOR);
  return normalizeLegacyTikkunSlug(firstParashaKey);
};

const getExactHolidayRoute = (target: TikkunLinkTarget) =>
  TIKKUN_IO_HOLIDAY_ROUTES.find((route) =>
    route.key === target.key &&
    supportsSpecific(route.specific, target.specific) &&
    isSameStartRef(target.ref, route.start)
  ) ?? null;

const getShabbatFallbackHolidayRoute = (target: TikkunLinkTarget) => {
  if (!target.key.endsWith(SHABBAT_KEY_SUFFIX)) return null;

  const baseKey = target.key.slice(0, -SHABBAT_KEY_SUFFIX.length);

  return TIKKUN_IO_HOLIDAY_ROUTES.find((route) =>
    route.key === baseKey &&
    supportsSpecific(route.specific, target.specific)
  ) ?? null;
};

const getTikkunRouteForTarget = (target: TikkunLinkTarget | null): TikkunRoute | null => {
  if (!target) return null;

  if (target.type === 'parasha') {
    if (FOUR_PARASHIOT_USING_REF.has(target.key)) return null;

    return {
      route: 'p',
      slug: getParashaSlug(target.key),
    };
  }

  const matchingHolidayRoute = getExactHolidayRoute(target) ?? getShabbatFallbackHolidayRoute(target);

  if (!matchingHolidayRoute) return null;

  return {
    route: 'h',
    slug: matchingHolidayRoute.slug,
  };
};

const toTikkunUrl = (target: TikkunLinkTarget | null) => {
  const route = getTikkunRouteForTarget(target);
  if (!route) return null;

  return `https://tikkun.io/#/${route.route}/${route.slug}`;
};

export {
  getTikkunRouteForTarget,
  toRefUrl,
  toTikkunUrl,
};

export type {
  TikkunLinkTarget,
  TikkunRoute,
};
