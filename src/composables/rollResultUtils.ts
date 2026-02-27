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
  db.map((bookData) => ({
    start: bookData[0][2],
    end: bookData[bookData.length - 1][2]
  }));

const getBookIndexFromPage = (page: number, ranges: PageRange[]): number =>
  ranges.findIndex((range) => page >= range.start && page <= range.end);

const getRemainingAfterBookForRoll = (
  fromPage: number,
  toPage: number,
  db: RealDb
): RemainingAfterBook | null => {
  if (fromPage === toPage) return null;

  const ranges = getBookPageRanges(db);
  const fromBookIndex = getBookIndexFromPage(fromPage, ranges);
  const toBookIndex = getBookIndexFromPage(toPage, ranges);

  if (fromBookIndex === -1 || toBookIndex === -1 || fromBookIndex === toBookIndex) {
    return null;
  }

  const targetBookRange = ranges[toBookIndex];
  const count = toPage > fromPage
    ? toPage - targetBookRange.start + 1
    : targetBookRange.end - toPage + 1;

  return {
    count,
    bookIndex: toBookIndex
  };
};

export {
  getRemainingAfterBookForRoll
};
