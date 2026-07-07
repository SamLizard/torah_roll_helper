import { describe, expect, it } from 'vitest';
import { formatCalendarDateLabel } from '../src/composables/calendar/dateDisplay';

describe('calendar date display', () => {
  it('keeps the existing Gregorian short month and day format', () => {
    expect(formatCalendarDateLabel('2025-10-07', 'gregorian', 'en-US')).toBe('Oct 7');
  });

  it('formats Hebrew calendar dates with Hebrew letters for Hebrew locales', () => {
    expect(formatCalendarDateLabel('2025-10-07', 'hebrew', 'he')).toBe('ט״ו תשרי');
  });

  it('formats Hebrew calendar dates with transliterated month names for non-Hebrew locales', () => {
    expect(formatCalendarDateLabel('2025-10-07', 'hebrew', 'en-US')).toBe('15 Tishrei');
    expect(formatCalendarDateLabel('2025-10-07', 'hebrew', 'fr')).toBe('15 Tishrei');
  });

  it('preserves leap-year Adar month names', () => {
    expect(formatCalendarDateLabel('2024-02-10', 'hebrew', 'en-US')).toBe('1 Adar I');
    expect(formatCalendarDateLabel('2024-03-11', 'hebrew', 'en-US')).toBe('1 Adar II');
  });

  it('falls back to the original label for invalid dates', () => {
    expect(formatCalendarDateLabel('not-a-date', 'hebrew', 'he')).toBe('not-a-date');
  });
});
