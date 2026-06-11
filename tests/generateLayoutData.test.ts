import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  }, 30000);

  it('accepts an explicit matching --page-count without warnings', () => {
    const result = generateLayoutData(optionsFor('248', { pageCount: 248 }));
    expect(result.pageCount).toBe(248);
    expect(result.warnings).toEqual([]);
  }, 30000);

  it('throws when page count disagrees with page_first_lines length', () => {
    expect(() => generateLayoutData(optionsFor('226', { pageCount: 999 }))).toThrowError(
      /page count is 999/i,
    );
  }, 30000);

  it('throws a clear error when the real_db file is missing', () => {
    expect(() =>
      generateLayoutData(optionsFor('226', { layoutRealDb: 'src/data/does-not-exist.json' })),
    ).toThrowError();
  }, 30000);
});

// The verifier must confirm each recorded first line is the EXACT, contiguous
// Torah source text (right letters, vowels, te'amim, order) for its page - not
// just that the consonants exist somewhere. A recorded line may be SHORTER than
// the physical line (contributors trim to the real page break), so an exact
// contiguous prefix is valid; anything else must fail.
describe('generateLayoutData first-line text integrity (layout 248)', () => {
  const layout = '248';
  const basePaths = buildDefaultPaths(layout, {});
  const firstLines = readJson<unknown[]>(basePaths.layoutFirstLines);
  const tempDir = mkdtempSync(join(tmpdir(), 'layout-first-lines-'));

  const runWithFirstLines = (label: string, lines: unknown[]) => {
    const path = join(tempDir, `${label}.json`);
    writeFileSync(path, JSON.stringify(lines));
    return generateLayoutData({
      ...basePaths,
      layout,
      pageCount: null,
      dryRun: true,
      layoutFirstLines: path,
    });
  };

  const cloneFirstLines = (): any[] => JSON.parse(JSON.stringify(firstLines));

  it('accepts the committed (hand-trimmed) first lines as-is', () => {
    expect(() => runWithFirstLines('valid', firstLines)).not.toThrow();
  }, 30000);

  it('accepts a recorded line that is a shorter exact prefix of the real line', () => {
    const lines = cloneFirstLines();
    const words = (lines[1][0][0] as string).split(' ');
    lines[1][0][0] = words.slice(0, words.length - 1).join(' ');
    expect(() => runWithFirstLines('shorter-prefix', lines)).not.toThrow();
  }, 30000);

  it('rejects an added word that is not in the source at that position', () => {
    const lines = cloneFirstLines();
    lines[1][0][0] = `${lines[1][0][0]} זזזזז`;
    expect(() => runWithFirstLines('extra-word', lines)).toThrowError(/page 2/);
  }, 30000);

  it('rejects a line whose vowels/te\'amim differ from the source', () => {
    const lines = cloneFirstLines();
    lines[1][0][0] = (lines[1][0][0] as string).normalize('NFD').replace(/[\u0591-\u05C7]/gu, '');
    expect(() => runWithFirstLines('stripped-nikud', lines)).toThrowError(
      /exact Torah source text/,
    );
  }, 30000);

  it('rejects a recorded line copied from a different verse', () => {
    const lines = cloneFirstLines();
    lines[1] = JSON.parse(JSON.stringify(firstLines[9]));
    expect(() => runWithFirstLines('wrong-verse', lines)).toThrowError();
  }, 30000);

  it('rejects a multi-segment line whose segments are not contiguous in the source', () => {
    const lines = cloneFirstLines();
    // page 4 is a real two-segment line (paragraph break). Replace the second
    // segment with a real word that does not immediately follow the first.
    lines[3] = [[lines[3][0][0], 'מֹשֶׁה']];
    expect(() => runWithFirstLines('noncontiguous', lines)).toThrowError(/page 4/);
  }, 30000);
});
