export interface Verse {
  book: number;
  chapter: number;
  verse: number;
}

export interface PageEntry {
  page: number;
  firstVerse: Verse;
}

// A Book is an array of [chapter, verse, page] tuples
export type BookData = [number, number, number][];

// The RealDb is an array containing 5 BookData arrays
export type RealDb = BookData[];

export interface RollInstructions {
  pages: number;
  rollDirection: 'forward' | 'backward';
}