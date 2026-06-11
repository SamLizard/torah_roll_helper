/**
 * Consolidated contributor tool for adding a new Torah scroll layout.
 *
 * A contributor who wants to add a layout <L> (identified by its total page
 * count, e.g. 226, 248, 250) provides two files:
 *   - src/data/<L>/real_db.json          (verse -> page index)
 *   - src/data/<L>/page_first_lines.json (first line(s) of every page)
 *
 * This script:
 *   1. Builds a normalized word/letter stream from the original Torah page JSON
 *      files (tikkun.io export: 1.json .. 245.json).
 *   2. Verifies the base 245 layout (real_db, target_pages 245 values, and the
 *      generated 245 page_titles_keys) so we trust the shared logic.
 *   3. Verifies the contributor layout <L> (real_db validity + every
 *      page_first_lines entry appears in order and matches its real_db ref).
 *   4. Updates src/data/target_pages.json, adding page["<L>"] to every
 *      ref / refEndPartial / refEnd (start refs use the page where the verse
 *      starts; end refs use the page where the verse ends).
 *   5. Generates src/data/<L>/page_titles_keys.json.
 *
 * Usage (run from the repo root):
 *   node --experimental-strip-types src/scripts/generate-layout-data.ts --layout 226
 *   node --experimental-strip-types src/scripts/generate-layout-data.ts --layout 248
 *   node --experimental-strip-types src/scripts/generate-layout-data.ts --layout 250 --page-count 250
 *   node --experimental-strip-types src/scripts/generate-layout-data.ts --layout 226 --dry-run
 *
 * The Torah source files default to scripts/torah (where this repo keeps the
 * tikkun.io export). Override with --source-dir <dir>.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Types -----------------------------------------------------------------

type VerseRef = {
  book: number;
  chapter: number;
  verse: number;
};

type PageByLayout = Record<string, number>;

type PageValue = number | PageByLayout;

type TargetRef = VerseRef & {
  page: PageValue;
};

type TargetPageEntry = {
  key: string;
  group?: string;
  specific?: string;
  type: string;
  ref: TargetRef;
  refEndPartial?: TargetRef;
  refEnd?: TargetRef;
};

type TargetRefField = 'ref' | 'refEndPartial' | 'refEnd';

type RealDbEntry = [chapter: number, verse: number, page: number];

type RealDb = RealDbEntry[][];

type SourceWord = {
  normalized: string;
  sourcePage: number;
  line: number;
  startChar: number;
  endChar: number;
  wordIndex: number;
};

type SourceLetter = {
  charIndex: number;
  letter: string;
};

type VerseStart = {
  wordIndex: number;
  ref: VerseRef;
};

type TorahStream = {
  words: SourceWord[];
  letters: SourceLetter[];
  lettersText: string;
  sourceText: string;
  verseStarts: VerseStart[];
  nextVerseByKey: Map<string, VerseRef>;
  pageStartWordIndexes245: Map<number, number>;
};

type RealDbPageEntry = {
  page: number;
  ref: VerseRef;
};

type FirstLineMatch = {
  endChar: number;
  parts: string[];
  startLetterIndex: number;
  startWordIndex: number;
};

type LayoutPaths = {
  sourceDir: string;
  targetPages: string;
  baseRealDb: string;
  basePageTitleKeys: string;
  layoutRealDb: string;
  layoutFirstLines: string;
  titleKeysOutput: string;
};

type CliOptions = LayoutPaths & {
  layout: string;
  pageCount: number | null;
  dryRun: boolean;
};

// --- Paths -----------------------------------------------------------------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// src/scripts -> src -> <repo root>
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const DATA_DIR = resolve(REPO_ROOT, 'src', 'data');
const DEFAULT_SOURCE_DIR = resolve(REPO_ROOT, 'scripts', 'torah');

const TARGET_REF_FIELDS: TargetRefField[] = ['ref', 'refEndPartial', 'refEnd'];
const VERSE_START_WORD_COUNT = 3;
const BASE_LAYOUT_KEY = '245';

const HEBREW_MARKS_PATTERN = /[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/gu;
const NON_HEBREW_PATTERN = /[^\u05D0-\u05EA]/gu;
const SOURCE_MARKER_PATTERN = /#\([^)]*\)/gu;
const MAKAF = '־';

const usage = `Generate and verify the data for a new Torah layout.

Usage (from repo root):
  node --experimental-strip-types src/scripts/generate-layout-data.ts --layout 226
  node --experimental-strip-types src/scripts/generate-layout-data.ts --layout 250 --page-count 250
  node --experimental-strip-types src/scripts/generate-layout-data.ts --layout 226 --dry-run

Options:
  --layout <id>            Required. Layout id / page count folder, e.g. 226, 248, 250.
  --page-count <n>         Optional. Inferred from page_first_lines length when omitted.
  --source-dir <dir>       Torah page JSON files (1.json ...). Default: scripts/torah
  --target-pages <file>    Default: src/data/target_pages.json
  --base-real-db <file>    Default: src/data/245/real_db.json
  --base-page-title-keys <file>  Default: src/data/245/page_titles_keys.json
  --real-db <file>         Default: src/data/<layout>/real_db.json
  --first-lines <file>     Default: src/data/<layout>/page_first_lines.json
  --title-keys-output <file>     Default: src/data/<layout>/page_titles_keys.json
  --dry-run                Verify and report planned writes without modifying files.
  --help                   Show this help.
`;

// --- Generic helpers -------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const readJson = <T>(path: string): T => {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
};

const refKey = ({ book, chapter, verse }: VerseRef): string => {
  return `${book}:${chapter}:${verse}`;
};

const formatRef = (ref: VerseRef): string => {
  return `${ref.book}:${ref.chapter}:${ref.verse}`;
};

const refsEqual = (left: VerseRef, right: VerseRef): boolean => {
  return left.book === right.book && left.chapter === right.chapter && left.verse === right.verse;
};

const compareRefs = (left: VerseRef, right: VerseRef): number => {
  if (left.book !== right.book) return left.book - right.book;
  if (left.chapter !== right.chapter) return left.chapter - right.chapter;
  return left.verse - right.verse;
};

const parsePositiveInt = (value: string, name: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${value}`);
  }
  return parsed;
};

// --- CLI -------------------------------------------------------------------

const buildDefaultPaths = (layout: string, overrides: Partial<LayoutPaths>): LayoutPaths => {
  const layoutDir = resolve(DATA_DIR, layout);
  return {
    sourceDir: overrides.sourceDir ?? DEFAULT_SOURCE_DIR,
    targetPages: overrides.targetPages ?? resolve(DATA_DIR, 'target_pages.json'),
    baseRealDb: overrides.baseRealDb ?? resolve(DATA_DIR, BASE_LAYOUT_KEY, 'real_db.json'),
    basePageTitleKeys:
      overrides.basePageTitleKeys ?? resolve(DATA_DIR, BASE_LAYOUT_KEY, 'page_titles_keys.json'),
    layoutRealDb: overrides.layoutRealDb ?? resolve(layoutDir, 'real_db.json'),
    layoutFirstLines: overrides.layoutFirstLines ?? resolve(layoutDir, 'page_first_lines.json'),
    titleKeysOutput: overrides.titleKeysOutput ?? resolve(layoutDir, 'page_titles_keys.json'),
  };
};

const parseArgs = (argv: string[]): CliOptions => {
  let layout: string | null = null;
  let pageCount: number | null = null;
  let dryRun = false;
  const overrides: Partial<LayoutPaths> = {};

  const requireNext = (arg: string, next: string | undefined): string => {
    if (next == null) throw new Error(`Missing value for ${arg}`);
    return next;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--help' || arg === '-h') {
      console.log(usage);
      process.exit(0);
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--layout') {
      layout = requireNext(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--page-count') {
      pageCount = parsePositiveInt(requireNext(arg, next), arg);
      index += 1;
      continue;
    }
    if (arg === '--source-dir') {
      overrides.sourceDir = resolve(requireNext(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--target-pages') {
      overrides.targetPages = resolve(requireNext(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--base-real-db') {
      overrides.baseRealDb = resolve(requireNext(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--base-page-title-keys') {
      overrides.basePageTitleKeys = resolve(requireNext(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--real-db') {
      overrides.layoutRealDb = resolve(requireNext(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--first-lines') {
      overrides.layoutFirstLines = resolve(requireNext(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--title-keys-output') {
      overrides.titleKeysOutput = resolve(requireNext(arg, next));
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!layout) {
    throw new Error(`--layout is required.\n\n${usage}`);
  }

  return {
    layout,
    pageCount,
    dryRun,
    ...buildDefaultPaths(layout, overrides),
  };
};

// --- Torah source stream ---------------------------------------------------

const collectStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => collectStrings(item));
};

const normalizeSpaces = (text: string): string => {
  return text.replace(/\s+/gu, ' ').trim();
};

const stripSourceMarkers = (text: string): string => {
  return text.replace(SOURCE_MARKER_PATTERN, '');
};

const normalizeLetters = (text: string): string => {
  return stripSourceMarkers(text)
    .normalize('NFD')
    .replace(HEBREW_MARKS_PATTERN, '')
    .replace(NON_HEBREW_PATTERN, '');
};

const isVerseRef = (value: unknown): value is VerseRef => {
  return (
    isRecord(value) &&
    typeof value.book === 'number' &&
    typeof value.chapter === 'number' &&
    typeof value.verse === 'number'
  );
};

const getLineVerses = (value: unknown): VerseRef[] => {
  if (!isRecord(value) || !Array.isArray(value.verses)) return [];
  return value.verses.filter(isVerseRef);
};

const getSourcePageFiles = (sourceDir: string): string[] => {
  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  const files = readdirSync(sourceDir)
    .filter((file) => /^\d+\.json$/u.test(file))
    .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));

  if (files.length === 0) {
    throw new Error(`No numeric JSON page files found in ${sourceDir}`);
  }

  return files.map((file) => resolve(sourceDir, file));
};

const endsWithMakaf = (text: string): boolean => {
  const trimmed = text.trimEnd();
  return trimmed.endsWith(MAKAF) || trimmed.endsWith('-');
};

const appendSourceLine = (sourceText: string, lineText: string): string => {
  if (!lineText) return sourceText;
  if (!sourceText) return lineText;
  return `${sourceText}${endsWithMakaf(sourceText) ? '' : ' '}${lineText}`;
};

const getSourceEndChar = (sourceText: string, lastLetterCharIndex: number): number => {
  let endChar = lastLetterCharIndex + 1;

  while (
    endChar < sourceText.length &&
    !/\s/u.test(sourceText[endChar]) &&
    sourceText[endChar] !== MAKAF &&
    sourceText[endChar] !== '-'
  ) {
    endChar += 1;
  }

  if (sourceText[endChar] === MAKAF || sourceText[endChar] === '-') {
    return endChar + 1;
  }

  return endChar;
};

const tokenizeLineWords = ({
  globalStartChar,
  lineText,
  line,
  sourcePage,
  wordCountSoFar,
}: {
  globalStartChar: number;
  lineText: string;
  line: number;
  sourcePage: number;
  wordCountSoFar: number;
}): SourceWord[] => {
  const lineWords: SourceWord[] = [];

  Array.from(lineText.matchAll(/[^\s\u05BE]+/gu)).forEach((match) => {
    const raw = match[0];
    const normalized = normalizeLetters(raw);
    if (!normalized) return;

    const startChar = globalStartChar + (match.index ?? 0);
    lineWords.push({
      normalized,
      sourcePage,
      line,
      startChar,
      endChar: startChar + raw.length,
      wordIndex: wordCountSoFar + lineWords.length,
    });
  });

  return lineWords;
};

const readTorahStream = (sourceDir: string): TorahStream => {
  let sourceText = '';
  const words: SourceWord[] = [];
  const verseStarts: VerseStart[] = [];
  const pageStartWordIndexes245 = new Map<number, number>();
  let nextWordStartsVerse = true;

  getSourcePageFiles(sourceDir).forEach((path) => {
    const sourcePage = Number.parseInt(basename(path, '.json'), 10);
    const lines = readJson<unknown[]>(path);

    lines.forEach((line, lineIndex) => {
      const pendingVerses = getLineVerses(line);
      const lineText = normalizeSpaces(stripSourceMarkers(collectStrings(isRecord(line) ? line.text : null).join(' ')));
      const sourceTextWithLine = appendSourceLine(sourceText, lineText);
      const globalStartChar = sourceTextWithLine.length - lineText.length;
      const lineWords = tokenizeLineWords({
        globalStartChar,
        lineText,
        line: lineIndex + 1,
        sourcePage,
        wordCountSoFar: words.length,
      });
      let pendingVerseIndex = 0;

      lineWords.forEach((word) => {
        const raw = sourceTextWithLine.slice(word.startChar, word.endChar);
        const endsVerse = raw.includes('׃');

        if (!pageStartWordIndexes245.has(sourcePage)) {
          pageStartWordIndexes245.set(sourcePage, words.length);
        }

        if (nextWordStartsVerse && pendingVerseIndex < pendingVerses.length) {
          verseStarts.push({
            wordIndex: words.length,
            ref: pendingVerses[pendingVerseIndex],
          });
          pendingVerseIndex += 1;
          nextWordStartsVerse = false;
        }

        words.push({ ...word, wordIndex: words.length });

        if (endsVerse) nextWordStartsVerse = true;
      });

      if (pendingVerseIndex !== pendingVerses.length) {
        throw new Error(
          `Could not place every verse marker on source page ${sourcePage}, line ${lineIndex + 1}`,
        );
      }

      sourceText = sourceTextWithLine;
    });
  });

  const letters: SourceLetter[] = [];
  for (let charIndex = 0; charIndex < sourceText.length; charIndex += 1) {
    const letter = sourceText[charIndex];
    if (/^[\u05D0-\u05EA]$/u.test(letter)) {
      letters.push({ charIndex, letter });
    }
  }

  const nextVerseByKey = new Map<string, VerseRef>();
  verseStarts.forEach((verseStart, index) => {
    const nextVerse = verseStarts[index + 1]?.ref;
    if (nextVerse) nextVerseByKey.set(refKey(verseStart.ref), nextVerse);
  });

  return {
    words,
    letters,
    lettersText: letters.map(({ letter }) => letter).join(''),
    sourceText,
    verseStarts,
    nextVerseByKey,
    pageStartWordIndexes245,
  };
};

// --- real_db helpers -------------------------------------------------------

const buildRealDbPageEntries = (realDb: RealDb): RealDbPageEntry[] => {
  return realDb.flatMap((bookEntries, bookIndex) => {
    return bookEntries.map(([chapter, verse, page]) => ({
      page,
      ref: { book: bookIndex + 1, chapter, verse },
    }));
  });
};

const buildRealDbEntryByPage = (realDb: RealDb): Map<number, RealDbPageEntry> => {
  const entryByPage = new Map<number, RealDbPageEntry>();
  buildRealDbPageEntries(realDb).forEach((entry) => {
    entryByPage.set(entry.page, entry);
  });
  return entryByPage;
};

const getVerseStartPage = (realDb: RealDb, ref: VerseRef): number => {
  const entries = buildRealDbPageEntries(realDb).sort((left, right) => {
    return compareRefs(left.ref, right.ref);
  });
  let page = entries.length > 0 ? entries[0].page : 1;

  for (const entry of entries) {
    if (compareRefs(entry.ref, ref) > 0) break;
    page = entry.page;
  }

  return page;
};

// --- First-line matching (verification) ------------------------------------

const getFirstLineParts = (entry: unknown): string[] => {
  if (Array.isArray(entry) && entry.length > 0) {
    return entry.map((column) => normalizeSpaces(collectStrings(column).join(' ')));
  }
  return [normalizeSpaces(collectStrings(entry).join(' '))];
};

const flattenFirstLineEntry = (entry: unknown): string => {
  return getFirstLineParts(entry).join(' ').trim();
};

const getWordIndexAtOrAfterChar = (words: SourceWord[], charIndex: number): number | null => {
  const word = words.find((sourceWord) => sourceWord.endChar > charIndex);
  return word?.wordIndex ?? null;
};

const findFirstLinePartMatch = ({
  expectedPart,
  startLetterIndex,
  stream,
}: {
  expectedPart: string;
  startLetterIndex: number;
  stream: TorahStream;
}) => {
  const expectedLetters = normalizeLetters(expectedPart);
  if (!expectedLetters) return null;

  const matchedLetterIndex = stream.lettersText.indexOf(expectedLetters, startLetterIndex);
  if (matchedLetterIndex === -1) return null;

  const startChar = stream.letters[matchedLetterIndex].charIndex;
  const lastLetter = stream.letters[matchedLetterIndex + expectedLetters.length - 1];
  const endChar = getSourceEndChar(stream.sourceText, lastLetter.charIndex);
  const startWordIndex = getWordIndexAtOrAfterChar(stream.words, startChar);
  if (startWordIndex == null) return null;

  return {
    endChar,
    startLetterIndex: matchedLetterIndex,
    startWordIndex,
    text: stream.sourceText.slice(startChar, endChar),
  };
};

const findFirstLineMatch = ({
  firstLineEntry,
  startLetterIndex,
  stream,
}: {
  firstLineEntry: unknown;
  startLetterIndex: number;
  stream: TorahStream;
}): FirstLineMatch | null => {
  const expectedParts = getFirstLineParts(firstLineEntry);
  const matchedParts: string[] = [];
  let currentStartLetterIndex = startLetterIndex;
  let firstPartStartLetterIndex: number | null = null;
  let firstPartStartWordIndex: number | null = null;
  let endChar = 0;

  for (const expectedPart of expectedParts) {
    const match = findFirstLinePartMatch({
      expectedPart,
      startLetterIndex: currentStartLetterIndex,
      stream,
    });
    if (!match) return null;

    firstPartStartLetterIndex ??= match.startLetterIndex;
    firstPartStartWordIndex ??= match.startWordIndex;
    matchedParts.push(match.text);
    currentStartLetterIndex = match.startLetterIndex + normalizeLetters(expectedPart).length;
    endChar = match.endChar;
  }

  if (firstPartStartLetterIndex == null || firstPartStartWordIndex == null) return null;

  return {
    endChar,
    parts: matchedParts,
    startLetterIndex: firstPartStartLetterIndex,
    startWordIndex: firstPartStartWordIndex,
  };
};

const findAllFirstLineMatches = ({
  firstLineEntry,
  startLetterIndex,
  stream,
}: {
  firstLineEntry: unknown;
  startLetterIndex: number;
  stream: TorahStream;
}): FirstLineMatch[] => {
  const matches: FirstLineMatch[] = [];
  let currentStartLetterIndex = startLetterIndex;

  while (currentStartLetterIndex < stream.letters.length) {
    const match = findFirstLineMatch({
      firstLineEntry,
      startLetterIndex: currentStartLetterIndex,
      stream,
    });
    if (!match) break;
    matches.push(match);
    currentStartLetterIndex = match.startLetterIndex + 1;
  }

  return matches;
};

const findFirstVerseStartAtOrAfter = (verseStarts: VerseStart[], wordIndex: number): VerseRef | null => {
  return verseStarts.find((start) => start.wordIndex >= wordIndex)?.ref ?? null;
};

// --- Layout verification ---------------------------------------------------

const verifyRealDbStructure = ({
  realDb,
  pageCount,
  label,
}: {
  realDb: RealDb;
  pageCount: number;
  label: string;
}): string[] => {
  const issues: string[] = [];
  const seenPages = new Set<number>();

  buildRealDbPageEntries(realDb).forEach(({ page, ref }) => {
    if (page < 1 || page > pageCount) {
      issues.push(`${label}: ref ${formatRef(ref)} points to page ${page}, outside 1-${pageCount}`);
    }
    if (seenPages.has(page)) {
      issues.push(`${label}: duplicate real_db entry for page ${page} (ref ${formatRef(ref)})`);
    }
    seenPages.add(page);
  });

  for (let page = 1; page <= pageCount; page += 1) {
    if (!seenPages.has(page)) {
      issues.push(`${label}: real_db has no entry for page ${page}`);
    }
  }

  return issues;
};

const verifyFirstLinesAgainstSource = ({
  firstLines,
  realDb,
  stream,
  label,
}: {
  firstLines: unknown[];
  realDb: RealDb;
  stream: TorahStream;
  label: string;
}): string[] => {
  const issues: string[] = [];
  const realDbByPage = buildRealDbEntryByPage(realDb);
  let nextSearchStartLetterIndex = 0;

  firstLines.forEach((firstLineEntry, pageIndex) => {
    const page = pageIndex + 1;
    const expectedLine = flattenFirstLineEntry(firstLineEntry);

    if (!expectedLine) {
      issues.push(`${label}: page ${page} has an empty first-line entry`);
      return;
    }

    const matches = findAllFirstLineMatches({
      firstLineEntry,
      startLetterIndex: nextSearchStartLetterIndex,
      stream,
    });

    if (matches.length === 0) {
      issues.push(
        `${label}: page ${page} first line not found in source after the previous page start: "${expectedLine}"`,
      );
      return;
    }

    const realDbEntry = realDbByPage.get(page);
    const matchesWithRefs = matches.map((candidate) => ({
      match: candidate,
      firstVerseRef: findFirstVerseStartAtOrAfter(stream.verseStarts, candidate.startWordIndex),
    }));

    // Prefer the occurrence whose first verse equals the real_db ref for this
    // page; short first lines can occur several times in the source stream.
    const preferred =
      (realDbEntry &&
        matchesWithRefs.find(
          ({ firstVerseRef }) => firstVerseRef != null && refsEqual(firstVerseRef, realDbEntry.ref),
        )) ||
      matchesWithRefs[0];

    nextSearchStartLetterIndex = preferred.match.startLetterIndex + 1;

    if (!realDbEntry) {
      // structural check already reports missing pages.
      return;
    }

    if (!preferred.firstVerseRef) {
      issues.push(`${label}: page ${page} has no verse start at or after the matched first line`);
      return;
    }

    if (!refsEqual(preferred.firstVerseRef, realDbEntry.ref)) {
      issues.push(
        `${label}: page ${page} first line maps to verse ${formatRef(preferred.firstVerseRef)} ` +
          `but real_db says ${formatRef(realDbEntry.ref)}`,
      );
    }
  });

  return issues;
};

// --- target_pages page resolution ------------------------------------------

const getPageForLayout = (page: PageValue, layout: string): number => {
  if (typeof page === 'number') return page;
  const value = page[layout];
  if (value == null) throw new Error(`Missing ${layout} page value in ${JSON.stringify(page)}`);
  return value;
};

const getVerseStartWords = (ref: VerseRef, stream: TorahStream): string[] => {
  const verseStart = stream.verseStarts.find((start) => refsEqual(start.ref, ref));
  if (!verseStart) {
    throw new Error(`Could not find verse ${refKey(ref)} in Torah source`);
  }
  const nextVerseStart = stream.verseStarts.find((start) => start.wordIndex > verseStart.wordIndex);
  const endWordIndex = nextVerseStart?.wordIndex ?? stream.words.length;

  return stream.words
    .slice(verseStart.wordIndex, endWordIndex)
    .map((word) => word.normalized)
    .slice(0, VERSE_START_WORD_COUNT);
};

const getPageFirstWords = (pageFirstLine: unknown): string[] => {
  return getFirstLineParts(pageFirstLine)
    .join(' ')
    .split(/[\s\u05BE]+/u)
    .map((raw) => normalizeLetters(raw))
    .filter(Boolean)
    .slice(0, VERSE_START_WORD_COUNT);
};

const startsWithWords = (actual: string[], expected: string[]): boolean => {
  return expected.length > 0 && expected.every((word, index) => actual[index] === word);
};

/**
 * For each page, whether the page physically begins with the verse that real_db
 * lists as the page's first verse. When true, a verse that *ends* exactly where
 * the next page starts actually ends on the previous page.
 */
const buildPageStartsAtListedVerse = ({
  firstLines,
  realDb,
  pageCount,
  stream,
}: {
  firstLines: unknown[];
  realDb: RealDb;
  pageCount: number;
  stream: TorahStream;
}): Map<number, boolean> => {
  const entryByPage = buildRealDbEntryByPage(realDb);
  const pageStartsAtListedVerse = new Map<number, boolean>();

  for (let page = 1; page <= pageCount; page += 1) {
    const entry = entryByPage.get(page);
    const pageFirstLine = firstLines[page - 1];
    if (!entry || !pageFirstLine) {
      pageStartsAtListedVerse.set(page, false);
      continue;
    }

    pageStartsAtListedVerse.set(
      page,
      startsWithWords(getPageFirstWords(pageFirstLine), getVerseStartWords(entry.ref, stream)),
    );
  }

  return pageStartsAtListedVerse;
};

const getVerseEndPage = ({
  ref,
  realDb,
  pageCount,
  pageStartsAtListedVerse,
  stream,
}: {
  ref: VerseRef;
  realDb: RealDb;
  pageCount: number;
  pageStartsAtListedVerse: Map<number, boolean>;
  stream: TorahStream;
}): number => {
  const startPage = getVerseStartPage(realDb, ref);
  const nextVerse = stream.nextVerseByKey.get(refKey(ref));
  if (!nextVerse) return pageCount;

  const nextVersePage = getVerseStartPage(realDb, nextVerse);
  if (nextVersePage === startPage) return startPage;

  const nextPageEntry = buildRealDbEntryByPage(realDb).get(nextVersePage);
  const nextVerseStartsAtTopOfPage =
    nextPageEntry != null &&
    refsEqual(nextPageEntry.ref, nextVerse) &&
    pageStartsAtListedVerse.get(nextVersePage) === true;

  return nextVerseStartsAtTopOfPage ? nextVersePage - 1 : nextVersePage;
};

const getRefPageForLayout = ({
  field,
  ref,
  realDb,
  pageCount,
  pageStartsAtListedVerse,
  stream,
}: {
  field: TargetRefField;
  ref: VerseRef;
  realDb: RealDb;
  pageCount: number;
  pageStartsAtListedVerse: Map<number, boolean>;
  stream: TorahStream;
}): number => {
  if (field === 'ref') {
    return getVerseStartPage(realDb, ref);
  }
  return getVerseEndPage({ ref, realDb, pageCount, pageStartsAtListedVerse, stream });
};

const withLayoutPage = (ref: TargetRef, layout: string, calculatedPage: number): TargetRef => {
  const basePage =
    typeof ref.page === 'number' ? { [BASE_LAYOUT_KEY]: ref.page } : { ...ref.page };

  return {
    ...ref,
    page: { ...basePage, [layout]: calculatedPage },
  };
};

const updateTargetEntry = ({
  entry,
  layout,
  realDb,
  pageCount,
  pageStartsAtListedVerse,
  stream,
}: {
  entry: TargetPageEntry;
  layout: string;
  realDb: RealDb;
  pageCount: number;
  pageStartsAtListedVerse: Map<number, boolean>;
  stream: TorahStream;
}): TargetPageEntry => {
  const updateRef = (field: TargetRefField, ref: TargetRef | undefined): TargetRef | undefined => {
    if (!ref) return undefined;
    const calculatedPage = getRefPageForLayout({
      field,
      ref,
      realDb,
      pageCount,
      pageStartsAtListedVerse,
      stream,
    });
    return withLayoutPage(ref, layout, calculatedPage);
  };

  return {
    ...entry,
    ref: updateRef('ref', entry.ref) ?? entry.ref,
    refEndPartial: updateRef('refEndPartial', entry.refEndPartial),
    refEnd: updateRef('refEnd', entry.refEnd),
  };
};

const countChangedLayoutRefs = ({
  before,
  after,
  layout,
}: {
  before: TargetPageEntry[];
  after: TargetPageEntry[];
  layout: string;
}): number => {
  return after.reduce((count, entry, index) => {
    return (
      count +
      TARGET_REF_FIELDS.filter((field) => {
        const beforeRef = before[index][field];
        const afterRef = entry[field];
        if (!afterRef) return false;
        const beforeHadLayout =
          beforeRef != null &&
          typeof beforeRef.page !== 'number' &&
          beforeRef.page[layout] != null;
        if (!beforeHadLayout) return true;
        return getPageForLayout(beforeRef.page, layout) !== getPageForLayout(afterRef.page, layout);
      }).length
    );
  }, 0);
};

// --- page_titles_keys generation -------------------------------------------

const buildPageTitleKeys = ({
  entries,
  layout,
  realDb,
  pageCount,
}: {
  entries: TargetPageEntry[];
  layout: string;
  realDb: RealDb;
  pageCount: number;
}): string[][] => {
  const pageTitleKeys: string[][] = Array.from({ length: pageCount }, () => []);

  entries
    .filter((entry) => entry.type === 'parasha')
    .forEach((entry) => {
      if (!entry.refEnd) {
        throw new Error(`Parasha ${entry.key} is missing refEnd`);
      }

      const startPage = getPageForLayout(entry.ref.page, layout);
      const endPage = getVerseStartPage(realDb, entry.refEnd);

      for (let page = startPage; page <= endPage; page += 1) {
        const pageKeys = pageTitleKeys[page - 1];
        if (!pageKeys) {
          throw new Error(`Parasha ${entry.key} maps to page ${page}, outside the ${layout} layout`);
        }
        pageKeys.push(entry.key);
      }
    });

  return pageTitleKeys;
};

const findPageTitleKeysMismatch = (actual: string[][], expected: string[][]): number | null => {
  if (actual.length !== expected.length) return Math.min(actual.length, expected.length);
  const index = actual.findIndex((pageKeys, pageIndex) => {
    return JSON.stringify(pageKeys) !== JSON.stringify(expected[pageIndex]);
  });
  return index === -1 ? null : index;
};

const findEmptyTitlePages = (pageTitleKeys: string[][]): number[] => {
  return pageTitleKeys
    .map((keys, index) => ({ keys, page: index + 1 }))
    .filter(({ keys }) => keys.length === 0)
    .map(({ page }) => page);
};

// --- Orchestration ---------------------------------------------------------

type GenerateResult = {
  layout: string;
  pageCount: number;
  changedTargetRefs: number;
  updatedTargetPages: TargetPageEntry[];
  pageTitleKeys: string[][];
  warnings: string[];
};

const assertNoIssues = (issues: string[]): void => {
  if (issues.length > 0) {
    throw new Error(`Verification failed:\n- ${issues.join('\n- ')}`);
  }
};

/**
 * Pure core: reads inputs, verifies everything, and computes the updated
 * target_pages + page_titles_keys. Performs no writes, so tests can call it
 * directly and assert on the results.
 */
const generateLayoutData = (options: CliOptions): GenerateResult => {
  const warnings: string[] = [];
  const stream = readTorahStream(options.sourceDir);

  const baseRealDb = readJson<RealDb>(options.baseRealDb);
  const baseFirstLinesPath = resolve(dirname(options.baseRealDb), 'page_first_lines.json');
  const layoutRealDb = readJson<RealDb>(options.layoutRealDb);
  const layoutFirstLines = readJson<unknown[]>(options.layoutFirstLines);
  const entries = readJson<TargetPageEntry[]>(options.targetPages);
  const baseTitleKeys = readJson<string[][]>(options.basePageTitleKeys);

  const pageCount = options.pageCount ?? layoutFirstLines.length;
  if (options.pageCount != null && options.pageCount !== layoutFirstLines.length) {
    warnings.push(
      `--page-count ${options.pageCount} differs from page_first_lines length ${layoutFirstLines.length}; using ${options.pageCount}`,
    );
  }
  if (layoutFirstLines.length !== pageCount) {
    throw new Error(
      `page_first_lines has ${layoutFirstLines.length} entries but page count is ${pageCount}`,
    );
  }

  // 1) Verify the base 245 layout so we trust the shared logic.
  const baseIssues: string[] = [];
  baseIssues.push(
    ...verifyRealDbStructure({ realDb: baseRealDb, pageCount: baseTitleKeys.length, label: '245 real_db' }),
  );
  if (existsSync(baseFirstLinesPath)) {
    baseIssues.push(
      ...verifyFirstLinesAgainstSource({
        firstLines: readJson<unknown[]>(baseFirstLinesPath),
        realDb: baseRealDb,
        stream,
        label: '245 page_first_lines',
      }),
    );
  } else {
    warnings.push(`Base first lines not found at ${baseFirstLinesPath}; skipped 245 first-line check`);
  }
  assertNoIssues(baseIssues);

  // base 245 target page values must match what real_db says.
  const base245Issues: string[] = [];
  entries.forEach((entry) => {
    const calculated = getVerseStartPage(baseRealDb, entry.ref);
    const existing = getPageForLayout(entry.ref.page, BASE_LAYOUT_KEY);
    if (calculated !== existing) {
      base245Issues.push(
        `${entry.key}.ref ${formatRef(entry.ref)}: target_pages has 245=${existing}, real_db says ${calculated}`,
      );
    }
  });
  assertNoIssues(base245Issues);

  // generated 245 page_titles_keys must match the committed file.
  const baseTitleKeysGenerated = buildPageTitleKeys({
    entries,
    layout: BASE_LAYOUT_KEY,
    realDb: baseRealDb,
    pageCount: baseTitleKeys.length,
  });
  const baseMismatch = findPageTitleKeysMismatch(baseTitleKeysGenerated, baseTitleKeys);
  if (baseMismatch != null) {
    throw new Error(
      `Generated 245 page_titles_keys differs from ${options.basePageTitleKeys} at page ${baseMismatch + 1}: ` +
        `generated ${JSON.stringify(baseTitleKeysGenerated[baseMismatch])}, ` +
        `expected ${JSON.stringify(baseTitleKeys[baseMismatch])}`,
    );
  }

  // 2) Verify the contributor layout.
  const layoutIssues: string[] = [];
  layoutIssues.push(
    ...verifyRealDbStructure({ realDb: layoutRealDb, pageCount, label: `${options.layout} real_db` }),
  );
  layoutIssues.push(
    ...verifyFirstLinesAgainstSource({
      firstLines: layoutFirstLines,
      realDb: layoutRealDb,
      stream,
      label: `${options.layout} page_first_lines`,
    }),
  );
  assertNoIssues(layoutIssues);

  // 3) Update target_pages.
  const pageStartsAtListedVerse = buildPageStartsAtListedVerse({
    firstLines: layoutFirstLines,
    realDb: layoutRealDb,
    pageCount,
    stream,
  });
  const updatedTargetPages = entries.map((entry) =>
    updateTargetEntry({
      entry,
      layout: options.layout,
      realDb: layoutRealDb,
      pageCount,
      pageStartsAtListedVerse,
      stream,
    }),
  );
  const changedTargetRefs = countChangedLayoutRefs({
    before: entries,
    after: updatedTargetPages,
    layout: options.layout,
  });

  // 4) Generate page_titles_keys for the new layout.
  const pageTitleKeys = buildPageTitleKeys({
    entries: updatedTargetPages,
    layout: options.layout,
    realDb: layoutRealDb,
    pageCount,
  });
  const emptyPages = findEmptyTitlePages(pageTitleKeys);
  if (emptyPages.length > 0) {
    throw new Error(
      `Generated ${options.layout} page_titles_keys has empty pages: ${emptyPages.join(', ')}`,
    );
  }

  return {
    layout: options.layout,
    pageCount,
    changedTargetRefs,
    updatedTargetPages,
    pageTitleKeys,
    warnings,
  };
};

const printSummary = (options: CliOptions, result: GenerateResult): void => {
  console.log(`Layout:                ${result.layout} (${result.pageCount} pages)`);
  console.log(`Source dir:            ${options.sourceDir}`);
  console.log(`real_db:               ${options.layoutRealDb}`);
  console.log(`page_first_lines:      ${options.layoutFirstLines}`);
  console.log(`target_pages refs set: ${result.changedTargetRefs}`);
  console.log(`page_titles_keys out:  ${options.titleKeysOutput}`);
  result.warnings.forEach((warning) => console.log(`warning:               ${warning}`));
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));
  const result = generateLayoutData(options);

  if (options.dryRun) {
    console.log('Dry run (no files written).');
    printSummary(options, result);
    return;
  }

  writeFileSync(options.targetPages, `${JSON.stringify(result.updatedTargetPages, null, 2)}\n`);
  writeFileSync(options.titleKeysOutput, `${JSON.stringify(result.pageTitleKeys, null, 2)}\n`);

  console.log('Wrote updated target_pages.json and page_titles_keys.');
  printSummary(options, result);
};

// Only run main when executed directly, so tests can import the helpers.
const isDirectRun = (() => {
  const entry = process.argv[1];
  return entry != null && resolve(entry) === fileURLToPath(import.meta.url);
})();

if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { generateLayoutData, buildDefaultPaths, parseArgs };
export type { CliOptions, GenerateResult, TargetPageEntry, RealDb };
