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

type BookData = [number, number, number][];

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
