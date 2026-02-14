interface TorahRef {
  book: number;
  chapter: number;
  verse: number;
  page: number;
}

type Verse = Omit<TorahRef, 'page'>;

interface PageEntry {
  page: number;
  firstVerse: Verse;
}

// A Book is an array of [chapter, verse, page] tuples
type BookData = [number, number, number][];

// The RealDb is an array containing 5 BookData arrays
type RealDb = BookData[];

interface RollInstructions {
  pages: number;
  rollDirection: 'forward' | 'backward';
}

export {
  type TorahRef,
  type Verse,
  type PageEntry,
  type BookData,
  type RealDb,
  type RollInstructions,
};
