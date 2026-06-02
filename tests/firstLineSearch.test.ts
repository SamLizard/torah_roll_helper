import { describe, expect, it } from 'vitest';
import {
  getMinimumLineStartQueryLength,
  hasMostlyVavPageStarts,
  normalizeForTypedInput,
  preparePageFirstLines,
} from '../src/composables/firstLineSearch';
import pageFirstLines226 from '../src/data/226/page_first_lines.json';
import pageFirstLines245 from '../src/data/245/page_first_lines.json';
import pageFirstLines248 from '../src/data/248/page_first_lines.json';
import type { PageFirstLine } from '../src/composables/firstLineSearch';

const preparedPages226 = preparePageFirstLines(pageFirstLines226 as PageFirstLine[]);
const preparedPages245 = preparePageFirstLines(pageFirstLines245 as PageFirstLine[]);
const preparedPages248 = preparePageFirstLines(pageFirstLines248 as PageFirstLine[]);

describe('first line search', () => {
  it('detects layouts where more than 90 percent of pages start with vav', () => {
    expect(hasMostlyVavPageStarts(preparedPages226)).toBe(false);
    expect(hasMostlyVavPageStarts(preparedPages245)).toBe(true);
    expect(hasMostlyVavPageStarts(preparedPages248)).toBe(true);
  });

  it('requires two letters for non-vav starts unless the layout is mostly vav-starting', () => {
    const nonVavQuery = normalizeForTypedInput('ב');

    expect(getMinimumLineStartQueryLength(nonVavQuery, preparedPages226)).toBe(2);
    expect(getMinimumLineStartQueryLength(nonVavQuery, preparedPages245)).toBe(1);
    expect(getMinimumLineStartQueryLength(nonVavQuery, preparedPages248)).toBe(1);
  });

  it('always requires two letters for vav starts', () => {
    const vavQuery = normalizeForTypedInput('ו');

    expect(getMinimumLineStartQueryLength(vavQuery, preparedPages226)).toBe(2);
    expect(getMinimumLineStartQueryLength(vavQuery, preparedPages245)).toBe(2);
  });
});
