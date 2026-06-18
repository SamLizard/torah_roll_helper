import type { TikkunLinkTarget, TikkunProvider } from './types';
import { joinUrlParts } from './utils';
import type { Verse } from '@/types';

const SEFARIA_BOOK_NAMES: Record<number, string> = {
  1: 'Genesis',
  2: 'Exodus',
  3: 'Leviticus',
  4: 'Numbers',
  5: 'Deuteronomy',
};

const getReadingUrl = (_target: TikkunLinkTarget | null) => null;

const getRefUrl = (ref: Verse | null) => {
  if (!ref) return null;

  const bookName = SEFARIA_BOOK_NAMES[ref.book];
  if (!bookName) return null;

  return joinUrlParts('https://www.sefaria.org', `${bookName}.${ref.chapter}.${ref.verse}`);
};

const getPageUrl = () => null;

const sefariaProvider: TikkunProvider = {
  id: 'sefaria',
  nameKey: 'settings.tikkunProviders.sefaria.name',
  descriptionKey: 'settings.tikkunProviders.sefaria.description',
  websiteUrl: 'https://www.sefaria.org',
  supportedLayoutKeys: null,
  capabilities: {
    readings: false,
    refs: true,
    pages: false,
  },
  getReadingUrl,
  getRefUrl,
  getPageUrl,
};

export { getPageUrl, getReadingUrl, getRefUrl, sefariaProvider };