import { describe, expect, it } from 'vitest';
import realDb from '../src/data/real_db.json';
import type { RealDb } from '../src/types';
import { getRemainingAfterBookForRoll } from '../src/composables/rollResultUtils';

const db = realDb as RealDb;

describe('getRemainingAfterBookForRoll', () => {
  it('computes forward remainder from beginning of 3rd book to page 189', () => {
    const result = getRemainingAfterBookForRoll(112, 189, db);

    expect(result).toEqual({
      count: 41,
      bookIndex: 3
    });
  });

  it('computes forward remainder when crossing into the next book', () => {
    const result = getRemainingAfterBookForRoll(140, 151, db);

    expect(result).toEqual({
      count: 3,
      bookIndex: 3
    });
  });

  it('computes backward remainder using the destination book', () => {
    const result = getRemainingAfterBookForRoll(189, 112, db);

    expect(result).toEqual({
      count: 37,
      bookIndex: 2
    });
  });

  it('returns null when both pages are in the same book', () => {
    const result = getRemainingAfterBookForRoll(160, 170, db);

    expect(result).toBeNull();
  });
});
