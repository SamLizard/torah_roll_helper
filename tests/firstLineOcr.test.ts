import { describe, expect, it } from 'vitest';
import {
  analyzeFirstLineText,
  correctOcrWords,
  normalizeOcrText,
} from '../src/composables/firstLineOcr';

describe('first line OCR helpers', () => {
  it('normalizes Hebrew OCR text by stripping marks and punctuation', () => {
    expect(normalizeOcrText('בְּרֵאשִׁ֖ית, "בָּרָ֣א"  אֱלֹהִ֑ים!')).toBe('בראשית ברא אלהים');
  });

  it('corrects noisy OCR words against the Torah first-line dictionary', () => {
    const result = correctOcrWords('ברשית ברא אלהימ את השמימ ואת הארצ');

    expect(result.correctedText).toBe('בראשית ברא אלהים את השמים ואת הארץ');
    expect(result.averageWordCorrectionScore).toBeGreaterThanOrEqual(80);
    expect(result.lowConfidenceWordCount).toBe(0);
  });

  it('ranks the opening line of Bereshit as the best match for a noisy OCR sample', () => {
    const result = analyzeFirstLineText('ברשית ברא אלהימ את השמימ ואת הארצ');

    expect(result.bestMatch?.pageNumber).toBe(1);
    expect(result.bestMatch?.score).toBeGreaterThanOrEqual(90);
    expect(result.reliability).not.toBe('unreliable');
  });

  it('keeps ambiguous common openings in suggestion mode instead of forcing a 100 percent match', () => {
    const result = analyzeFirstLineText('וידבר יהוה אל משה לאמר');

    expect(result.bestMatch).not.toBeNull();
    expect(result.alternativeMatches.length).toBeGreaterThan(0);
    expect(result.reliability).toBe('suggestions');
  });
});
