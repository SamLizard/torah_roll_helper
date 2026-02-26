import type { RealDb, RollInstructions } from '../types';
import targetsData from '@/data/target_pages.json';
import pageTitlesData from '@/data/page_titles_keys.json'; 
import type { ManualData } from '@/components/ManualEntryDialog.vue';

export const getPageNumber = (
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

export const getApproximatePages = (
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

export const computeRoll = (fromPage: number, toPage: number): RollInstructions => {
  const pages = Math.abs(toPage - fromPage);
  const rollDirection = toPage > fromPage ? 'forward' : 'backward';

  return { pages, rollDirection };
};

export const getPageTitleKeys = (pageNumber: number, ref: ManualData): string[] => {
  const readingMatches = targetsData.filter(t => 
    t.ref.book === ref.book && 
    t.ref.chapter === ref.chapter && 
    t.ref.verse === ref.verse
  );
  
  if (readingMatches.length > 0) {
    return readingMatches.map(m => `readingTargets.${m.key}`);
  }

  const titles = (pageTitlesData as string[][])[pageNumber - 1];
  
  if (titles && titles.length > 0) {
    return titles.map(key => `readingTargets.${key}`);
  }

  return [];
};