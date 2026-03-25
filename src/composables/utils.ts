import type { RealDb, RollInstructions } from '../types';
import pageTitlesData from '@/data/page_titles_keys.json';
import type { ManualData } from '@/components/ManualEntryDialog.vue';
import { matchesTargetSpecific, readingTargets } from './readingTargets';
import type { ReadingTarget } from './readingTargets';

const pageTitles = pageTitlesData as string[][];
const readingTargetsByKey = new Map<string, ReadingTarget>(
  readingTargets.map((target) => [target.key, target])
);

const isVisiblePageTitleKey = (key: string, isInGola: boolean): boolean => {
  const target = readingTargetsByKey.get(key);
  if (!target) return true;
  return matchesTargetSpecific(target.specific, isInGola);
};

const getPageNumber = (
  realDb: RealDb, 
  bookNumber: number, 
  chapterNumber: number, 
  verseNumber: number
): number => {
  if (bookNumber < 1 || bookNumber > 5) return 0;

  const bookData = realDb[bookNumber - 1];
  
  if (!bookData || bookData.length === 0) return 0;

  const [firstC, firstV, firstP] = bookData[0];
  
  if (chapterNumber < firstC || (chapterNumber === firstC && verseNumber < firstV)) {
    if (bookNumber === 1) return 0;

    return firstP - 1; 
  }

  let left = 0;
  let right = bookData.length - 1;
  let resultPage = 0;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const [c, v, p] = bookData[mid];

    if (c < chapterNumber || (c === chapterNumber && v <= verseNumber)) {
      resultPage = p;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return resultPage;
};

const getApproximatePages = (
  realDb: RealDb, 
  bookNumber: number, 
  chapterNumber: number
): number[] => {
  const startPage = getPageNumber(realDb, bookNumber, chapterNumber, 1);
  
  if (startPage === 0) return [];

  const bookData = realDb[bookNumber - 1];

  const nextChapterEntry = bookData.find(
    ([c, v]) => c === chapterNumber + 1 && v === 1
  );

  let endPage;
  if (nextChapterEntry) {
    endPage = nextChapterEntry[2] - 1;
  } else {
    endPage = getPageNumber(realDb, bookNumber, chapterNumber + 1, 1);
  }
  
  if (endPage === 0 && bookData.length > 0) {
    endPage = bookData[bookData.length - 1][2];
  }

  if (endPage < startPage) endPage = startPage;
  
  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
};

const computeRoll = (fromPage: number, toPage: number): RollInstructions => {
  const pages = Math.abs(toPage - fromPage);
  const rollDirection = toPage > fromPage ? 'forward' : 'backward';

  return { pages, rollDirection };
};

// DONE 24.3: Pay attention that the page titles that are from the targets are also filtered by the isInGola option. Also, now that we did the TODO 24.2 (now it is DONE 24.2), the title of the page that appears is only the current one, not all the one of all the same readings. Fix it back.
const getPageTitleKeys = (pageNumber: number, ref: ManualData, isInGola: boolean): string[] => {
  const readingMatches: string[] = [];

  if (ref.chapter !== null && ref.verse !== null) {
    for (const target of readingTargets) {
      if (
        target.ref.book === ref.book &&
        target.ref.chapter === ref.chapter &&
        target.ref.verse === ref.verse &&
        matchesTargetSpecific(target.specific, isInGola)
      ) {
        readingMatches.push(target.key);
      }
    }
  }

  if (readingMatches.length > 0) {
    return readingMatches.map((key) => `readingTargets.${key}`);
  }

  const titleKeys = pageTitles[pageNumber - 1] ?? [];
  return titleKeys
    .filter((key) => isVisiblePageTitleKey(key, isInGola))
    .map((key) => `readingTargets.${key}`);
};

export {
  computeRoll,
  getApproximatePages,
  getPageNumber,
  getPageTitleKeys,
};
