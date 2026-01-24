import type { RealDb, RollInstructions } from '../types';

/**
 * Binary search to find the page containing a specific verse.
 */
export const getPageNumber = (
  realDb: RealDb, 
  bookNumber: number, 
  chapterNumber: number, 
  verseNumber: number
): number => {
  if (bookNumber < 1 || bookNumber > 5) return 0;

  const bookData = realDb[bookNumber - 1];
  
  // Safety check for empty book data
  if (!bookData || bookData.length === 0) return 0;

  // --- FIX START ---
  // Check if the requested verse is BEFORE the very first recorded entry of this book.
  // Example: Book 3 starts at [1, 3, 112]. If we search for 1:1, it is "before" 1:3.
  const [firstC, firstV, firstP] = bookData[0];
  
  if (chapterNumber < firstC || (chapterNumber === firstC && verseNumber < firstV)) {
    // If we are in Genesis (Book 1), before the start really means "doesn't exist" (Page 0).
    if (bookNumber === 1) return 0;

    // For Books 2-5, if it's before the first entry, it is on the page immediately preceding the first entry.
    return firstP - 1; 
  }
  // --- FIX END ---

  let left = 0;
  let right = bookData.length - 1;
  let resultPage = 0;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const [c, v, p] = bookData[mid];

    // Check if current entry is "smaller or equal" to target
    if (c < chapterNumber || (c === chapterNumber && v <= verseNumber)) {
      resultPage = p;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return resultPage;
};

/**
 * Returns all pages that contain any part of the given chapter.
 */
export const getApproximatePages = (
  realDb: RealDb, 
  bookNumber: number, 
  chapterNumber: number
): number[] => {
  // 1. Find start page
  const startPage = getPageNumber(realDb, bookNumber, chapterNumber, 1);
  
  if (startPage === 0) return [];

  const bookData = realDb[bookNumber - 1];

  // 2. Find end page
  // Check if next chapter starts exactly at verse 1 on a new page
  const nextChapterEntry = bookData.find(
    ([c, v]) => c === chapterNumber + 1 && v === 1
  );

  let endPage;
  if (nextChapterEntry) {
    // If next chapter starts clean on a page, current ends on previous page
    endPage = nextChapterEntry[2] - 1;
  } else {
    // Otherwise, calculate page of next chapter start
    endPage = getPageNumber(realDb, bookNumber, chapterNumber + 1, 1);
  }
  
  // If we went past the end of the book (0), use the last page of the book
  if (endPage === 0 && bookData.length > 0) {
    endPage = bookData[bookData.length - 1][2];
  }

  // Safety check
  if (endPage < startPage) endPage = startPage;
  
  // 3. Generate range
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