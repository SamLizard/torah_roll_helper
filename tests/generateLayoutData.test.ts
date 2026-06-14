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
  fixFirstLines: false,
  ...buildDefaultPaths(layout, {}),
  ...overrides,
});

const pageValue = (page: number | Record<string, number>, layout: string): number => {
  return typeof page === 'number' ? page : page[layout];
};

// The 248 working copy can be temporarily edited (e.g. while a contributor is
// fixing it). To keep these regression tests independent of that, prepare a
// known-good first-lines file per layout by running the built-in fixer (which
// only rewrites pages that fail verification) into a temp file, and point the
// tests at it.
const knownGoodFirstLines = (layout: string): string => {
  const result = generateLayoutData(optionsFor(layout, { fixFirstLines: true }));
  const dir = mkdtempSync(join(tmpdir(), `good-first-lines-${layout}-`));
  const path = join(dir, 'page_first_lines.json');
  writeFileSync(path, JSON.stringify(result.fixedFirstLines ?? []));
  return path;
};

// Both committed layouts were verified by hand, so the script must reproduce
// them exactly. This is the strongest regression guard.
describe.each(['226', '248'])('generateLayoutData reproduces committed layout %s', (layout) => {
  const result = generateLayoutData(optionsFor(layout, { layoutFirstLines: knownGoodFirstLines(layout) }));

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
    const result = generateLayoutData(
      optionsFor('248', { pageCount: 248, layoutFirstLines: knownGoodFirstLines('248') }),
    );
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
  // Use a known-good baseline (the working copy may be mid-edit), then corrupt
  // copies of it to assert the verifier catches each problem.
  const firstLines = readJson<unknown[]>(knownGoodFirstLines(layout));
  const tempDir = mkdtempSync(join(tmpdir(), 'layout-first-lines-'));

  const runWithFirstLines = (label: string, lines: unknown[]) => {
    const path = join(tempDir, `${label}.json`);
    writeFileSync(path, JSON.stringify(lines));
    return generateLayoutData({
      ...basePaths,
      layout,
      pageCount: null,
      dryRun: true,
      fixFirstLines: false,
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
      /does not match the source structure/,
    );
  }, 30000);

  it('rejects a recorded line copied from a different verse', () => {
    const lines = cloneFirstLines();
    lines[1] = JSON.parse(JSON.stringify(firstLines[9]));
    expect(() => runWithFirstLines('wrong-verse', lines)).toThrowError();
  }, 30000);

  it('rejects a multi-segment line whose segments are not contiguous in the source', () => {
    const lines = cloneFirstLines();
    // page 4 is a real two-segment line (setuma). Replace the second
    // segment with a real word that does not immediately follow the first.
    lines[3] = [[lines[3][0][0], 'מֹשֶׁה']];
    expect(() => runWithFirstLines('noncontiguous', lines)).toThrowError(/page 4/);
  }, 30000);

  it('rejects a line that merges two source segments into one fragment', () => {
    // The real bug: page 4 is `[["...עָקֵֽב׃", "אֶֽל־"]]` in the source (a
    // setuma break). Merging the two fragments into one string must be caught.
    const lines = cloneFirstLines();
    const [first, second] = lines[3][0] as string[];
    expect(second).toBeTypeOf('string'); // guard: page 4 really has two segments
    lines[3] = [[`${first} ${second}`]];
    expect(() => runWithFirstLines('merged-segments', lines)).toThrowError(
      /does not match the source structure/,
    );
  }, 30000);

  it('rejects splitting a single-column setuma into two columns', () => {
    // page 4 is one column with two segments `[["A","B"]]`. Recording it as two
    // columns `[["A"],["B"]]` is a different (wrong) structure.
    const lines = cloneFirstLines();
    const [first, second] = lines[3][0] as string[];
    lines[3] = [[first], [second]];
    expect(() => runWithFirstLines('wrong-column-split', lines)).toThrowError(
      /does not match the source structure/,
    );
  }, 30000);

  it('--fix-first-lines repairs a merged segment back into two segments', () => {
    const lines = cloneFirstLines();
    const [first, second] = lines[3][0] as string[];
    lines[3] = [[`${first} ${second}`]];
    const path = join(tempDir, 'to-fix.json');
    writeFileSync(path, JSON.stringify(lines));

    const result = generateLayoutData({
      ...basePaths,
      layout,
      pageCount: null,
      dryRun: true,
      fixFirstLines: true,
      layoutFirstLines: path,
    });

    expect(result.changedFirstLinePages).toContain(4);
    expect(result.fixedFirstLines?.[3]).toEqual([[first, second]]);
  }, 30000);

  it('--fix-first-lines leaves already-valid pages untouched', () => {
    const result = generateLayoutData({
      ...basePaths,
      layout,
      pageCount: null,
      dryRun: true,
      fixFirstLines: true,
      layoutFirstLines: knownGoodFirstLines(layout),
    });
    expect(result.changedFirstLinePages).toEqual([]);
  }, 30000);

  it('preserves a Haazinu two-column page (does not collapse it into one column)', () => {
    // Haazinu's poem is written in two columns on a page, recorded as two outer
    // arrays `[["A"],["B"]]`. This must verify, and --fix must not rewrite it.
    const twoColumnIndex = firstLines.findIndex(
      (entry) => Array.isArray(entry) && entry.length === 2,
    );
    expect(twoColumnIndex).toBeGreaterThanOrEqual(0);

    const result = generateLayoutData({
      ...basePaths,
      layout,
      pageCount: null,
      dryRun: true,
      fixFirstLines: true,
      layoutFirstLines: knownGoodFirstLines(layout),
    });

    expect(result.changedFirstLinePages).not.toContain(twoColumnIndex + 1);
    expect(result.fixedFirstLines?.[twoColumnIndex]).toEqual(firstLines[twoColumnIndex]);
    expect((result.fixedFirstLines?.[twoColumnIndex] as unknown[]).length).toBe(2);
  }, 30000);
});
