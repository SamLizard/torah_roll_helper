import type { TargetSpecific } from '@/composables/readingTargets';
import type { Verse } from '@/types';

type SpecificSupport = 'both' | Exclude<TargetSpecific, 'both'>;

const createVerse = (book: number, chapter: number, verse: number): Verse => ({
  book,
  chapter,
  verse,
});

const isSameVerse = (left: Verse, right: Verse) =>
  left.book === right.book && left.chapter === right.chapter && left.verse === right.verse;

const supportsSpecific = (supported: SpecificSupport, requested: TargetSpecific) =>
  supported === 'both' || supported === requested;

const joinUrlParts = (baseUrl: string, ...parts: Array<string | number>) => {
  const base = baseUrl.replace(/\/+$/u, '');
  const path = parts.map((part) => encodeURIComponent(String(part))).join('/');

  return path ? `${base}/${path}` : base;
};

const getFaviconUrl = (websiteUrl: string) => new URL('/favicon.ico', websiteUrl).toString();

export { createVerse, getFaviconUrl, isSameVerse, joinUrlParts, supportsSpecific };
export type { SpecificSupport };