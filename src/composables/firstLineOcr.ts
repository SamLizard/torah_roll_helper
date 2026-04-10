import { extract, partial_ratio, ratio, token_set_ratio, WRatio } from 'fuzzball';
import pageFirstLinesData from '@/data/page_first_lines.json';
import {
  normalizeForTypedInput,
  preparePageFirstLines,
  type PageFirstLine,
  type PreparedPageFirstLine,
} from '@/composables/firstLineSearch';

type MatchReliability = 'confirmed' | 'suggestions' | 'unreliable';

interface WordCorrection {
  originalWord: string;
  correctedWord: string;
  score: number;
  wasReplaced: boolean;
}

interface RankedFirstLineMatch {
  pageNumber: number;
  displayText: string;
  normalizedText: string;
  score: number;
  displayConfidence: number;
  scoreGap: number | null;
}

interface FirstLineTextAnalysis {
  inputText: string;
  normalizedText: string;
  correctedText: string;
  wordCorrections: WordCorrection[];
  averageWordCorrectionScore: number | null;
  lowConfidenceWordCount: number;
  reliability: MatchReliability;
  bestMatch: RankedFirstLineMatch | null;
  alternativeMatches: RankedFirstLineMatch[];
  rankedMatches: RankedFirstLineMatch[];
}

interface AnalyzeFirstLineTextOptions {
  candidatePages?: PreparedPageFirstLine[];
}

interface OcrProgressPayload {
  progress: number;
  status: string;
}

interface RecognizeFirstLineOptions {
  onProgress?: (payload: OcrProgressPayload) => void;
}

interface FirstLineOcrResult extends FirstLineTextAnalysis {
  rawText: string;
  extractedLines: string[];
  ocrConfidence: number | null;
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: {
    y0: number;
  };
}

interface TesseractParagraph {
  lines: TesseractLine[];
}

interface TesseractBlock {
  paragraphs: TesseractParagraph[];
}

interface TesseractPageData {
  text: string;
  confidence: number;
  blocks: TesseractBlock[] | null;
}

interface TesseractRecognizeResult {
  data: TesseractPageData;
}

interface TesseractWorker {
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  recognize: (
    image: HTMLCanvasElement,
    options?: Record<string, unknown>,
    output?: {
      text?: boolean;
      blocks?: boolean;
    }
  ) => Promise<TesseractRecognizeResult>;
}

interface TesseractModule {
  createWorker: (
    langs?: string | string[],
    oem?: number,
    options?: {
      logger?: (payload: OcrProgressPayload) => void;
    },
    config?: Record<string, string>
  ) => Promise<TesseractWorker>;
  OEM: {
    LSTM_ONLY: number;
  };
  PSM: {
    SINGLE_BLOCK: string;
  };
}

const FUZZBALL_OPTIONS = {
  full_process: false,
  force_ascii: false,
  collapseWhitespace: true,
};

const OCR_WHITELIST = 'אבגדהוזחטיכלמנסעפצקרשתךםןףץ ';
const WORD_CORRECTION_THRESHOLD = 80;
const LOW_WORD_SCORE_THRESHOLD = 70;
const CONFIRMED_MATCH_SCORE = 95;
const SUGGESTION_MATCH_SCORE = 85;
const UNRELIABLE_MATCH_SCORE = 70;
const CONFIRMED_GAP_SCORE = 5;
const DEFAULT_MATCH_LIMIT = 5;
const PREPARED_PAGE_FIRST_LINES = preparePageFirstLines(pageFirstLinesData as PageFirstLine[]);
const FINAL_FORM_TO_STANDARD_FORM: Record<string, string> = {
  ך: 'כ',
  ם: 'מ',
  ן: 'נ',
  ף: 'פ',
  ץ: 'צ',
};
const KNOWN_HEBREW_WORDS = Array.from(
  new Set(PREPARED_PAGE_FIRST_LINES.flatMap((page) => page.words).filter((word) => word.length > 0)),
).sort((left, right) => left.localeCompare(right, 'he'));
const KNOWN_HEBREW_WORDS_SET = new Set(KNOWN_HEBREW_WORDS);

const canonicalizeHebrewWord = (word: string): string => {
  return word.replace(/[ךםןףץ]/g, (character) => FINAL_FORM_TO_STANDARD_FORM[character] ?? character);
};

const KNOWN_HEBREW_WORDS_BY_CANONICAL = KNOWN_HEBREW_WORDS.reduce<Map<string, string[]>>((wordsByCanonical, word) => {
  const canonicalWord = canonicalizeHebrewWord(word);
  const currentWords = wordsByCanonical.get(canonicalWord) ?? [];

  currentWords.push(word);
  wordsByCanonical.set(canonicalWord, currentWords);

  return wordsByCanonical;
}, new Map());
const KNOWN_CANONICAL_WORDS = Array.from(KNOWN_HEBREW_WORDS_BY_CANONICAL.keys());

let workerPromise: Promise<TesseractWorker> | null = null;
let progressListener: RecognizeFirstLineOptions['onProgress'];

const clampScore = (value: number): number => {
  return Math.max(0, Math.min(100, Math.round(value)));
};

const normalizeOcrText = (text: string): string => {
  return normalizeForTypedInput(text);
};

const getBestDictionaryMatch = (word: string): { correctedWord: string; score: number } => {
  if (KNOWN_HEBREW_WORDS_SET.has(word)) {
    return {
      correctedWord: word,
      score: 100,
    };
  }

  const canonicalWord = canonicalizeHebrewWord(word);
  const canonicalMatches = KNOWN_HEBREW_WORDS_BY_CANONICAL.get(canonicalWord);

  if (canonicalMatches?.length) {
    const [bestCanonicalMatch] = canonicalMatches
      .map((candidateWord) => ({
        candidateWord,
        score: ratio(word, candidateWord, FUZZBALL_OPTIONS),
      }))
      .sort((left, right) => {
        const scoreDifference = right.score - left.score;
        if (scoreDifference !== 0) return scoreDifference;
        return right.candidateWord.length - left.candidateWord.length;
      });

    return {
      correctedWord: bestCanonicalMatch.candidateWord,
      score: 100,
    };
  }

  const [bestMatch] = extract(canonicalWord, KNOWN_CANONICAL_WORDS, {
    ...FUZZBALL_OPTIONS,
    limit: 1,
    scorer: ratio,
  });

  if (!bestMatch) {
    return {
      correctedWord: word,
      score: 0,
    };
  }

  const [canonicalMatch, score] = bestMatch;
  const dictionaryWords = KNOWN_HEBREW_WORDS_BY_CANONICAL.get(canonicalMatch) ?? [word];
  const [correctedWord] = dictionaryWords
    .map((candidateWord) => ({
      candidateWord,
      score: ratio(word, candidateWord, FUZZBALL_OPTIONS),
    }))
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) return scoreDifference;
      return right.candidateWord.length - left.candidateWord.length;
    });

  return {
    correctedWord: score >= WORD_CORRECTION_THRESHOLD ? correctedWord.candidateWord : word,
    score,
  };
};

const correctOcrWords = (text: string): Pick<FirstLineTextAnalysis, 'correctedText' | 'wordCorrections' | 'averageWordCorrectionScore' | 'lowConfidenceWordCount'> => {
  const normalizedText = normalizeOcrText(text);
  if (normalizedText.length === 0) {
    return {
      correctedText: '',
      wordCorrections: [],
      averageWordCorrectionScore: null,
      lowConfidenceWordCount: 0,
    };
  }

  const wordCorrections = normalizedText.split(' ').map((word) => {
    const { correctedWord, score } = getBestDictionaryMatch(word);

    return {
      originalWord: word,
      correctedWord,
      score,
      wasReplaced: correctedWord !== word,
    };
  });

  const correctedText = wordCorrections.map((entry) => entry.correctedWord).join(' ');
  const totalScore = wordCorrections.reduce((sum, entry) => sum + entry.score, 0);
  const averageWordCorrectionScore = wordCorrections.length > 0
    ? clampScore(totalScore / wordCorrections.length)
    : null;
  const lowConfidenceWordCount = wordCorrections.filter((entry) => entry.score < LOW_WORD_SCORE_THRESHOLD).length;

  return {
    correctedText,
    wordCorrections,
    averageWordCorrectionScore,
    lowConfidenceWordCount,
  };
};

const scoreSentenceMatch = (inputText: string, candidate: PreparedPageFirstLine): number => {
  const weightedScore = WRatio(inputText, candidate.normalizedText, FUZZBALL_OPTIONS);
  const orderedScore = ratio(inputText, candidate.normalizedText, FUZZBALL_OPTIONS);
  const partialScore = partial_ratio(inputText, candidate.normalizedText, FUZZBALL_OPTIONS);
  const tokenScore = token_set_ratio(inputText, candidate.normalizedText, {
    ...FUZZBALL_OPTIONS,
    trySimple: true,
  });
  const prefixLength = Math.min(inputText.length, candidate.normalizedText.length);
  const prefixScore = prefixLength > 0
    ? ratio(inputText.slice(0, prefixLength), candidate.normalizedText.slice(0, prefixLength), FUZZBALL_OPTIONS)
    : 0;
  const firstWordBonus = inputText.split(' ')[0] === candidate.words[0] ? 4 : 0;

  return clampScore(
    weightedScore * 0.45
      + orderedScore * 0.2
      + partialScore * 0.2
      + tokenScore * 0.1
      + prefixScore * 0.05
      + firstWordBonus,
  );
};

const buildRankedMatches = (
  correctedText: string,
  candidatePages: PreparedPageFirstLine[] = PREPARED_PAGE_FIRST_LINES,
): RankedFirstLineMatch[] => {
  if (correctedText.length === 0) return [];

  const rankedMatches = candidatePages
    .map((page) => ({
      page,
      score: scoreSentenceMatch(correctedText, page),
    }))
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) return scoreDifference;
      return left.page.pageNumber - right.page.pageNumber;
    })
    .slice(0, DEFAULT_MATCH_LIMIT);

  return rankedMatches.map(({ page, score }, index) => {
    const nextMatch = rankedMatches[index + 1];
    const scoreGap = nextMatch ? score - nextMatch.score : null;
    const displayConfidence = score >= CONFIRMED_MATCH_SCORE && (scoreGap ?? CONFIRMED_GAP_SCORE) >= CONFIRMED_GAP_SCORE
      ? 100
      : score;

    return {
      pageNumber: page.pageNumber,
      displayText: page.displayText,
      normalizedText: page.normalizedText,
      score,
      displayConfidence,
      scoreGap,
    };
  });
};

const getReliability = (
  rankedMatches: RankedFirstLineMatch[],
  lowConfidenceWordCount: number,
  averageWordCorrectionScore: number | null,
): MatchReliability => {
  const bestMatch = rankedMatches[0];
  const scoreGap = bestMatch?.scoreGap ?? 0;
  const hasWeakWordCoverage = lowConfidenceWordCount >= 2;
  const hasWeakAverage = averageWordCorrectionScore != null && averageWordCorrectionScore < WORD_CORRECTION_THRESHOLD;

  if (!bestMatch) return 'unreliable';

  if (
    bestMatch.score >= CONFIRMED_MATCH_SCORE
    && scoreGap >= CONFIRMED_GAP_SCORE
    && !hasWeakWordCoverage
    && !hasWeakAverage
  ) {
    return 'confirmed';
  }

  if (bestMatch.score >= SUGGESTION_MATCH_SCORE && !hasWeakWordCoverage) {
    return 'suggestions';
  }

  if (bestMatch.score < UNRELIABLE_MATCH_SCORE || hasWeakWordCoverage || hasWeakAverage) {
    return 'unreliable';
  }

  return 'suggestions';
};

const analyzeFirstLineText = (
  text: string,
  options: AnalyzeFirstLineTextOptions = {},
): FirstLineTextAnalysis => {
  const normalizedText = normalizeOcrText(text);
  const correctionResult = correctOcrWords(normalizedText);
  const rankedMatches = buildRankedMatches(
    correctionResult.correctedText,
    options.candidatePages ?? PREPARED_PAGE_FIRST_LINES,
  );
  const reliability = getReliability(
    rankedMatches,
    correctionResult.lowConfidenceWordCount,
    correctionResult.averageWordCorrectionScore,
  );

  return {
    inputText: text,
    normalizedText,
    correctedText: correctionResult.correctedText,
    wordCorrections: correctionResult.wordCorrections,
    averageWordCorrectionScore: correctionResult.averageWordCorrectionScore,
    lowConfidenceWordCount: correctionResult.lowConfidenceWordCount,
    reliability,
    bestMatch: rankedMatches[0] ?? null,
    alternativeMatches: rankedMatches.slice(1),
    rankedMatches,
  };
};

const loadImageFromBlob = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load the selected image.'));
    };

    image.src = objectUrl;
  });
};

const prepareImageForOcr = async (file: Blob): Promise<HTMLCanvasElement> => {
  const image = await loadImageFromBlob(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const minimumTargetSide = 1800;
  const maximumTargetSide = 2600;
  const targetLongestSide = Math.min(maximumTargetSide, Math.max(minimumTargetSide, longestSide));
  const scale = targetLongestSide / longestSide;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available in this browser.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.filter = 'grayscale(1) contrast(1.4)';
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  return canvas;
};

const getPrimaryOcrText = (pageData: TesseractPageData): { primaryText: string; extractedLines: string[] } => {
  const extractedLines = (pageData.blocks ?? [])
    .flatMap((block) => block.paragraphs)
    .flatMap((paragraph) => paragraph.lines)
    .sort((left, right) => {
      const topDifference = left.bbox.y0 - right.bbox.y0;
      if (topDifference !== 0) return topDifference;
      return right.confidence - left.confidence;
    })
    .map((line) => normalizeOcrText(line.text))
    .filter((line, index, lines) => line.length > 0 && lines.indexOf(line) === index);

  const primaryText = extractedLines[0] ?? normalizeOcrText(pageData.text);

  return {
    primaryText,
    extractedLines,
  };
};

const getOcrWorker = async (): Promise<TesseractWorker> => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tesseract = await import('tesseract.js') as unknown as TesseractModule;
      const worker = await Tesseract.createWorker(
        'heb',
        Tesseract.OEM.LSTM_ONLY,
        {
          logger: (payload) => {
            progressListener?.(payload);
          },
        },
        {
          load_system_dawg: '0',
          load_freq_dawg: '0',
        },
      );

      await worker.setParameters({
        tessedit_char_whitelist: OCR_WHITELIST,
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });

      return worker;
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
};

const recognizeFirstLineFromImage = async (
  file: Blob,
  options: RecognizeFirstLineOptions = {},
): Promise<FirstLineOcrResult> => {
  progressListener = options.onProgress;

  try {
    const canvas = await prepareImageForOcr(file);
    const worker = await getOcrWorker();
    const recognitionResult = await worker.recognize(
      canvas,
      {},
      {
        text: true,
        blocks: true,
      },
    );
    const { primaryText, extractedLines } = getPrimaryOcrText(recognitionResult.data);
    const analysis = analyzeFirstLineText(primaryText);

    return {
      ...analysis,
      rawText: recognitionResult.data.text,
      extractedLines,
      ocrConfidence: clampScore(recognitionResult.data.confidence),
    };
  } finally {
    progressListener = undefined;
  }
};

export {
  analyzeFirstLineText,
  correctOcrWords,
  normalizeOcrText,
  PREPARED_PAGE_FIRST_LINES,
  recognizeFirstLineFromImage,
};

export type {
  FirstLineOcrResult,
  FirstLineTextAnalysis,
  MatchReliability,
  OcrProgressPayload,
  RankedFirstLineMatch,
  WordCorrection,
};
