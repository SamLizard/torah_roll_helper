import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  generateLayoutData,
  buildDefaultPaths,
  type CliOptions,
} from '../src/scripts/generate-layout-data';

type RefField = 'ref' | 'refEndPartial' | 'refEnd';

const REF_FIELDS: RefField[] = ['ref', 'refEndPartial', 'refEnd'];

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const optionsFor = (layout: string, overrides: Partial<CliOptions> = {}): CliOptions => ({
  layout,
  pageCount: null,
  dryRun: true,
  ...buildDefaultPaths(layout, {}),
  ...overrides,
});

const pageValue = (page: number | Record<string, number>, layout: string): number => {
  return typeof page === 'number' ? page : page[layout];
};

// Both committed layouts were verified by hand, so the script must reproduce
// them exactly. This is the strongest regression guard.
describe.each(['226', '248'])('generateLayoutData reproduces committed layout %s', (layout) => {
  const result = generateLayoutData(optionsFor(layout));

  it('matches the committed target_pages.json layout values', () => {
    const committed = readJson<any[]>(buildDefaultPaths(layout, {}).targetPages);

    const diffs: string[] = [];
    result.updatedTargetPages.forEach((entry, index) => {
      const before = committed[index];
      REF_FIELDS.forEach((field) => {
        const beforeRef = before[field];
        const afterRef = (entry as any)[field];
        if (!beforeRef || !afterRef) return;
        const beforeValue = pageValue(beforeRef.page, layout);
        const afterValue = pageValue(afterRef.page, layout);
        if (beforeValue !== afterValue) {
          diffs.push(`${entry.key}.${field}: committed ${beforeValue} vs generated ${afterValue}`);
        }
      });
    });

    expect(diffs).toEqual([]);
  });

  it('matches the committed page_titles_keys.json', () => {
    const committed = readJson<string[][]>(buildDefaultPaths(layout, {}).titleKeysOutput);
    expect(result.pageTitleKeys).toEqual(committed);
  });

  it('preserves all existing layout page keys (245 plus others)', () => {
    result.updatedTargetPages.forEach((entry) => {
      REF_FIELDS.forEach((field) => {
        const ref = (entry as any)[field];
        if (!ref) return;
        expect(typeof ref.page).toBe('object');
        expect(ref.page['245']).toBeTypeOf('number');
        expect(ref.page[layout]).toBeTypeOf('number');
      });
    });
  });

  it('generates one title-key entry per page with no empty pages', () => {
    expect(result.pageTitleKeys).toHaveLength(result.pageCount);
    expect(result.pageTitleKeys.every((keys) => keys.length > 0)).toBe(true);
  });

  it('reports the correct page count and warns on no spurious issues', () => {
    expect(result.pageCount).toBe(Number(layout));
    expect(result.warnings).toEqual([]);
  });
});

describe('generateLayoutData input handling', () => {
  it('infers page count from page_first_lines when --page-count is omitted', () => {
    const result = generateLayoutData(optionsFor('226', { pageCount: null }));
    expect(result.pageCount).toBe(226);
  });

  it('accepts an explicit matching --page-count without warnings', () => {
    const result = generateLayoutData(optionsFor('248', { pageCount: 248 }));
    expect(result.pageCount).toBe(248);
    expect(result.warnings).toEqual([]);
  });

  it('throws when page count disagrees with page_first_lines length', () => {
    expect(() => generateLayoutData(optionsFor('226', { pageCount: 999 }))).toThrowError(
      /page count is 999/i,
    );
  });

  it('throws a clear error when the real_db file is missing', () => {
    expect(() =>
      generateLayoutData(optionsFor('226', { layoutRealDb: 'src/data/does-not-exist.json' })),
    ).toThrowError();
  });
});
