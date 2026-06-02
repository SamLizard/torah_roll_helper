import type { RealDb } from '@/types';

interface PageRange {
  start: number;
  end: number;
}

interface RemainingAfterBook {
  count: number;
  bookIndex: number;
}

const getBookPageRanges = (db: RealDb): PageRange[] =>
  // Pay attention, if the first page that a book is starting from, the perek/verse is not 1, it tells that the book started at the last page (that have both the end of a book and the beginning of the next book)
  db.map((bookData) => ({
    start: bookData[0][2] + (bookData[0][0] === 1 && bookData[0][1] === 1 ? 0 : -1),
    end: bookData[bookData.length - 1][2]
  }));

const getBookIndexFromPage = (page: number, ranges: PageRange[], fromEnd: boolean = false): number => {
  // If searching from the end, we want to find the last range that contains the page, and return a regular index (from the start). The thing is that when we reverse, the index we get is from the end, so we need to convert it back to the original index.
  const index = (fromEnd ? ranges.slice().reverse() : ranges).findIndex((range) => page >= range.start && page <= range.end);  
  if (index === -1) return -1;
  return fromEnd ? ranges.length - 1 - index : index;
};

const isBoundaryPage = (page: number, ranges: PageRange[]): boolean =>
  ranges.some((range) => range.start === page || range.end === page);

const getRemainingAfterBookForRoll = (
  fromPage: number,
  toPage: number,
  db: RealDb
): RemainingAfterBook | null => {
  if (fromPage === toPage) return null;

  const goingBackward = fromPage > toPage;
  const ranges = getBookPageRanges(db);
  const fromBookIndex = getBookIndexFromPage(fromPage, ranges);
  const toBookIndex = getBookIndexFromPage(toPage, ranges, goingBackward);  

  if (fromBookIndex === -1 || toBookIndex === -1 
      || fromBookIndex === toBookIndex
      || (goingBackward && toBookIndex === ranges.length - 1)
      || isBoundaryPage(toPage, ranges)
    ) {
    return null;
  }

  const targetBookRange = ranges[toBookIndex];
  const count = !goingBackward
    ? toPage - targetBookRange.start + 1
    : targetBookRange.end - toPage + 1;

  return {
    count,
    bookIndex: toBookIndex + (goingBackward ? 1 : 0)
  };
};

export {
  getRemainingAfterBookForRoll
};
