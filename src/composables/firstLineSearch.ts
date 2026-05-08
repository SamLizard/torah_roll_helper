type PageFirstLine = string[][];

interface PreparedPageFirstLine {
  pageNumber: number;
  rawText: string;
  normalizedText: string;
  displayText: string;
  words: string[];
  previewColumns: string[][];
}

interface DuplicateNormalizedFirstLine {
  normalizedText: string;
  pages: number[];
}

interface StartingWordGroup {
  prefix: string;
  pages: number[];
}

interface StartingWordStat {
  wordCount: number;
  sharedPrefixCount: number;
  pagesInSharedPrefixes: number;
  largestGroupSize: number;
  largestGroups: StartingWordGroup[];
}

const PARASHA_MARKERS_REGEX = /#\([פס]\)|\([פס]\)/gu;
const HEBREW_MARKS_REGEX = /[\u0591-\u05BD\u05BF-\u05C7]/gu;
const FORMAT_CHARS_REGEX = /[\u200C-\u200F\uFEFF]/gu;
const NON_HEBREW_LETTERS_REGEX = /[^א-ת\s]/gu;

const toPreviewColumns = (entry: unknown): string[][] => {
  if (typeof entry === 'string') return [[entry]];
  if (!Array.isArray(entry) || entry.length === 0) return [];

  if (entry.every((item) => typeof item === 'string')) {
    return [entry as string[]];
  }

  if (entry.every((item) => Array.isArray(item))) {
    return (entry as unknown[])
      .map((column) =>
        Array.isArray(column)
          ? column.filter((fragment): fragment is string => typeof fragment === 'string')
          : []
      )
      .filter((column) => column.length > 0);
  }

  return [];
};

const flattenPageFirstLine = (pageFirstLine: PageFirstLine): string => {
  return pageFirstLine.flat().join('');
};

const normalizeForTypedInput = (text: string): string => {
  return text
    .replace(PARASHA_MARKERS_REGEX, ' ')
    .normalize('NFKD')
    .replace(HEBREW_MARKS_REGEX, '')
    .replace(FORMAT_CHARS_REGEX, '')
    .replace(NON_HEBREW_LETTERS_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const preparePageFirstLines = (pageFirstLines: PageFirstLine[]): PreparedPageFirstLine[] => {
  return pageFirstLines.map((pageFirstLine, index) => {
    const previewColumns = toPreviewColumns(pageFirstLine);
    const rawText = flattenPageFirstLine(previewColumns);
    const normalizedText = normalizeForTypedInput(rawText);

    return {
      pageNumber: index + 1,
      rawText,
      normalizedText,
      displayText: normalizedText,
      words: normalizedText.length > 0 ? normalizedText.split(' ') : [],
      previewColumns,
    };
  });
};

const getPreparedPageFirstLines = (pageFirstLines: PageFirstLine[]): PreparedPageFirstLine[] => {
  return preparePageFirstLines(pageFirstLines);
};

const findPreparedPagesByLineStart = (
  inputText: string,
  preparedPages: PreparedPageFirstLine[]
): PreparedPageFirstLine[] => {
  const normalizedInput = normalizeForTypedInput(inputText);
  if (normalizedInput.length === 0) return [];

  return preparedPages.filter((page) => page.normalizedText.startsWith(normalizedInput));
};

const findPagesByLineStart = (inputText: string, preparedPages: PreparedPageFirstLine[]): number[] => {
  return findPreparedPagesByLineStart(inputText, preparedPages).map((page) => page.pageNumber);
};

const findPreparedPagesContainingTextInLine = (
  inputText: string,
  preparedPages: PreparedPageFirstLine[]
): PreparedPageFirstLine[] => {
  const normalizedInput = normalizeForTypedInput(inputText);
  if (normalizedInput.length === 0) return [];

  return preparedPages.filter((page) => page.normalizedText.includes(normalizedInput));
};

const findPagesContainingTextInLine = (
  inputText: string,
  preparedPages: PreparedPageFirstLine[]
): number[] => {
  return findPreparedPagesContainingTextInLine(inputText, preparedPages).map((page) => page.pageNumber);
};

const findDuplicateNormalizedFirstLines = (
  preparedPages: PreparedPageFirstLine[]
): DuplicateNormalizedFirstLine[] => {
  const pagesByNormalizedText = new Map<string, number[]>();

  preparedPages.forEach((page) => {
    const pages = pagesByNormalizedText.get(page.normalizedText) ?? [];
    pages.push(page.pageNumber);
    pagesByNormalizedText.set(page.normalizedText, pages);
  });

  return Array.from(pagesByNormalizedText.entries())
    .filter(([, pages]) => pages.length > 1)
    .map(([normalizedText, pages]) => ({
      normalizedText,
      pages,
    }))
    .sort((left, right) => left.pages[0] - right.pages[0]);
};

const getMinimumUniqueStartingWordCount = (
  page: PreparedPageFirstLine,
  preparedPages: PreparedPageFirstLine[]
): number | null => {
  for (let wordCount = 1; wordCount <= page.words.length; wordCount += 1) {
    const prefix = page.words.slice(0, wordCount).join(' ');
    const matches = preparedPages.filter((candidate) => candidate.normalizedText.startsWith(prefix));

    if (matches.length === 1) {
      return wordCount;
    }
  }

  return null;
};

const getStartingWordsPrefix = (words: string[], wordCount: number): string | null => {
  if (words.length < wordCount) return null;
  return words.slice(0, wordCount).join(' ');
};

const buildStartingWordStats = (preparedPages: PreparedPageFirstLine[]): StartingWordStat[] => {
  const maxWordCount = preparedPages.reduce((maxWords, page) => Math.max(maxWords, page.words.length), 0);
  const stats: StartingWordStat[] = [];

  for (let wordCount = 1; wordCount <= maxWordCount; wordCount += 1) {
    const pagesByPrefix = new Map<string, number[]>();

    preparedPages.forEach((page) => {
      const prefix = getStartingWordsPrefix(page.words, wordCount);
      if (!prefix) return;

      const pages = pagesByPrefix.get(prefix) ?? [];
      pages.push(page.pageNumber);
      pagesByPrefix.set(prefix, pages);
    });

    const sharedGroups = Array.from(pagesByPrefix.entries())
      .filter(([, pages]) => pages.length > 1)
      .map(([prefix, pages]) => ({
        prefix,
        pages,
      }))
      .sort((left, right) => {
        const sizeDifference = right.pages.length - left.pages.length;
        if (sizeDifference !== 0) return sizeDifference;
        return left.prefix.localeCompare(right.prefix, 'he');
      });

    const largestGroupSize = sharedGroups[0]?.pages.length ?? 0;
    const pagesInSharedPrefixes = sharedGroups.reduce((total, group) => total + group.pages.length, 0);

    stats.push({
      wordCount,
      sharedPrefixCount: sharedGroups.length,
      pagesInSharedPrefixes,
      largestGroupSize,
      largestGroups: sharedGroups.slice(0, 5),
    });
  }

  return stats;
};

export {
  buildStartingWordStats,
  findDuplicateNormalizedFirstLines,
  findPagesByLineStart,
  findPagesContainingTextInLine,
  findPreparedPagesByLineStart,
  findPreparedPagesContainingTextInLine,
  flattenPageFirstLine,
  getMinimumUniqueStartingWordCount,
  getPreparedPageFirstLines,
  normalizeForTypedInput,
  preparePageFirstLines,
  toPreviewColumns,
};

export type {
  DuplicateNormalizedFirstLine,
  PageFirstLine,
  PreparedPageFirstLine,
  StartingWordGroup,
  StartingWordStat,
};
