import { describe, expect, it } from 'vitest';
import { getPageNumber } from '../src/composables/utils';
import targetPagesData from '../src/data/target_pages.json';
import realDb from '../src/data/real_db.json';
import type { RealDb, TorahRef } from '../src/types';

type RefKey = 'ref' | 'refEndPartial' | 'refEnd';

interface ReadingTargetForTest {
  key: string;
  specific: string;
  ref: TorahRef;
  refEndPartial?: TorahRef;
  refEnd: TorahRef;
}

interface TargetReferenceCase {
  refId: string;
  page: number;
  calculatedPage: number;
}

const db = realDb as RealDb;
const targetPages = targetPagesData as ReadingTargetForTest[];
const refKeys: RefKey[] = ['ref', 'refEndPartial', 'refEnd'];

const expectedOnePageAfterStartRefIds = [
  'beshalach|both|refEndPartial',
  'eikev|both|refEnd',
  'emor|both|refEnd',
  'ki_tisa|both|refEnd',
  'sukkot-2|israel|refEnd',
  'vayechi|both|refEnd',
  'vayetzei|both|refEnd',
  'vezot_haberakhah|both|refEndPartial',
];

const getRefId = (target: ReadingTargetForTest, refKey: RefKey) =>
  `${target.key}|${target.specific}|${refKey}`;

const getCalculatedPage = (ref: TorahRef) =>
  getPageNumber(db, ref.book, ref.chapter, ref.verse);

const getAllReferenceCases = () =>
  targetPages.flatMap((target) =>
    refKeys.flatMap((refKey) => {
      const ref = target[refKey];

      if (!ref) return [];

      return [{
        refId: getRefId(target, refKey),
        page: ref.page,
        calculatedPage: getCalculatedPage(ref),
      } satisfies TargetReferenceCase];
    })
  );

describe('target_pages references', () => {
  it('keeps every reading start on the page calculated from book chapter and verse', () => {
    const mismatches = targetPages
      .map((target) => ({
        refId: getRefId(target, 'ref'),
        page: target.ref.page,
        calculatedPage: getCalculatedPage(target.ref),
      }))
      .filter(({ page, calculatedPage }) => page !== calculatedPage);

    expect(mismatches).toEqual([]);
  });

  it('keeps every ending reference on the calculated page or on the following page', () => {
    const invalidReferences = getAllReferenceCases()
      .filter(({ refId }) => !refId.endsWith('|ref'))
      .filter(({ page, calculatedPage }) => {
        const difference = page - calculatedPage;

        return difference !== 0 && difference !== 1;
      });

    expect(invalidReferences).toEqual([]);
  });

  it('tracks the known references whose ending verse continues on the next page', () => {
    const actualOnePageAfterStartRefIds = getAllReferenceCases()
      .filter(({ refId }) => !refId.endsWith('|ref'))
      .filter(({ page, calculatedPage }) => page === calculatedPage + 1)
      .map(({ refId }) => refId)
      .sort();

    expect(actualOnePageAfterStartRefIds).toEqual(expectedOnePageAfterStartRefIds);
  });
});
