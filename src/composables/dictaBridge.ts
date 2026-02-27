interface DictaReference {
  book: number;
  chapter: number;
  verse: number | null;
}

type PartialDictaReference = {
  book?: number | null;
  chapter?: number | null;
  verse?: number | null;
};

type UnknownRecord = Record<string, unknown>;

const BOOK_ALIASES: Record<number, string[]> = {
  1: ['genesis', 'bereishit', 'bereshit', 'בראשית'],
  2: ['exodus', 'shemot', 'שמות'],
  3: ['leviticus', 'vayikra', 'ויקרא'],
  4: ['numbers', 'bamidbar', 'במדבר'],
  5: ['deuteronomy', 'devarim', 'דברים'],
};

const NO_RESULT_PATTERNS = [
  /no source found/i,
  /no results?/i,
  /לא נמצא מקור/u,
  /לא נמצאו תוצאות/u,
];

const asRecord = (value: unknown): UnknownRecord | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const toStrictPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const normalizeText = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0591-\u05C7]/g, '')
    .toLowerCase();

const decodeText = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getBookFromString = (value: string): number | null => {
  const normalized = normalizeText(value);
  const entries = Object.entries(BOOK_ALIASES);

  for (const [bookStr, aliases] of entries) {
    const book = Number.parseInt(bookStr, 10);
    if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return book;
    }
  }

  return null;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseBook = (value: unknown): number | null => {
  const directNumber = toStrictPositiveInt(value);
  if (directNumber && directNumber >= 1 && directNumber <= 5) return directNumber;

  if (typeof value === 'string') {
    return getBookFromString(value);
  }

  return null;
};

const numberAfterKeywords = (value: string, keywords: string[]): number | null => {
  const escaped = keywords.map((keyword) =>
    keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`(?:${escaped.join('|')})\\s*[:.\\-]?\\s*(\\d{1,3})`, 'iu');
  const match = value.match(pattern);
  if (!match || !match[1]) return null;
  return Number.parseInt(match[1], 10);
};

const parseReferenceFromText = (value: string): DictaReference | null => {
  const decoded = decodeText(value);
  const book = getBookFromString(decoded);
  if (!book) return null;

  const chapter = numberAfterKeywords(decoded, ['chapter', 'chap', 'perek', 'פרק']);
  const verse = numberAfterKeywords(decoded, ['verse', 'pasuk', 'פסוק']);

  if (chapter && chapter > 0) {
    return {
      book,
      chapter,
      verse: verse && verse > 0 ? verse : null,
    };
  }

  const aliases = BOOK_ALIASES[book].map((alias) => escapeRegex(alias)).join('|');
  const looseMatch = decoded.match(
    new RegExp(`(?:${aliases})\\s*[:._\\-/\\s]+(\\d{1,3})(?:\\D+(\\d{1,3}))?`, 'iu')
  );
  if (!looseMatch || !looseMatch[1]) return null;

  const looseChapter = Number.parseInt(looseMatch[1], 10);
  const looseVerse = looseMatch[2] ? Number.parseInt(looseMatch[2], 10) : null;

  return {
    book,
    chapter: looseChapter,
    verse: looseVerse && looseVerse > 0 ? looseVerse : null,
  };
};

const cleanReference = (candidate: PartialDictaReference): DictaReference | null => {
  const book = candidate.book ?? null;
  const chapter = candidate.chapter ?? null;
  const verse = candidate.verse ?? null;

  if (!book || book < 1 || book > 5) return null;
  if (!chapter || chapter <= 0) return null;

  return {
    book,
    chapter,
    verse: verse && verse > 0 ? verse : null,
  };
};

const parseObjectReference = (value: UnknownRecord): DictaReference | null => {
  const direct = cleanReference({
    book: parseBook(
      value.book ??
        value.bookId ??
        value.book_id ??
        value.sefer ??
        value.bookName ??
        value.book_name
    ),
    chapter: toStrictPositiveInt(
      value.chapter ??
        value.chapterId ??
        value.chapter_id ??
        value.perek ??
        value.chapterNum ??
        value.chapter_num
    ),
    verse: toStrictPositiveInt(
      value.verse ?? value.verse_id ?? value.pasuk ?? value.verseNum ?? value.verse_num
    ),
  });

  if (direct) return direct;

  const textLikeKeys = [
    'reference',
    'ref',
    'verseId',
    'verse_id',
    'title',
    'text',
    'url',
    'compName',
    'compNameHe',
    'name',
    'label',
  ];

  for (const key of textLikeKeys) {
    const textValue = value[key];
    if (typeof textValue !== 'string') continue;
    const parsed = parseReferenceFromText(textValue);
    if (parsed) return parsed;
  }

  return null;
};

const maybeParseJsonString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
};

const parseDictaPayload = (payload: unknown): DictaReference | null => {
  const queue: unknown[] = [maybeParseJsonString(payload)];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = maybeParseJsonString(queue.shift());

    if (typeof current === 'string') {
      const parsed = parseReferenceFromText(current);
      if (parsed) return parsed;
      continue;
    }

    if (Array.isArray(current)) {
      current.slice(0, 20).forEach((item) => queue.push(item));
      continue;
    }

    const currentRecord = asRecord(current);
    if (!currentRecord) continue;
    if (visited.has(currentRecord)) continue;
    visited.add(currentRecord);

    const parsed = parseObjectReference(currentRecord);
    if (parsed) return parsed;

    Object.values(currentRecord)
      .slice(0, 40)
      .forEach((item) => queue.push(item));
  }

  return null;
};

const isDictaNoResultPayload = (payload: unknown): boolean => {
  const queue: unknown[] = [maybeParseJsonString(payload)];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = maybeParseJsonString(queue.shift());

    if (typeof current === 'string') {
      if (NO_RESULT_PATTERNS.some((pattern) => pattern.test(current))) {
        return true;
      }
      continue;
    }

    if (Array.isArray(current)) {
      current.slice(0, 20).forEach((item) => queue.push(item));
      continue;
    }

    const currentRecord = asRecord(current);
    if (!currentRecord) continue;
    if (visited.has(currentRecord)) continue;
    visited.add(currentRecord);

    const status = currentRecord.status;
    if (typeof status === 'string' && /no[_-]?result/i.test(status)) {
      return true;
    }

    Object.values(currentRecord)
      .slice(0, 40)
      .forEach((item) => queue.push(item));
  }

  return false;
};

const isDictaOrigin = (origin: string): boolean => {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === 'illuminate.dicta.org.il' || host.endsWith('.dicta.org.il');
  } catch {
    return false;
  }
};

export type { DictaReference };
export { parseDictaPayload, isDictaNoResultPayload, isDictaOrigin };
