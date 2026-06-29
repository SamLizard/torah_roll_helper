import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { generateMonthlyReadings, type MonthlyReadings } from '../src/composables/calendar/calendar';
import { useOptionsStore } from '../src/stores/options';

const generateReadings = ({
  anchorDate,
  isInGola = false,
}: {
  anchorDate: string;
  isInGola?: boolean;
}) => {
  setActivePinia(createPinia());
  const options = useOptionsStore();
  options.changeIsInGola(isInGola);

  return generateMonthlyReadings(new Date(`${anchorDate}T12:00:00`));
};

const findReading = (
  readings: MonthlyReadings,
  range: keyof MonthlyReadings,
  readingId: string
) => readings[range].find((reading) => reading.readingId === readingId);

const readingIdsForDate = (
  readings: MonthlyReadings,
  range: keyof MonthlyReadings,
  dateIso: string,
  direction: 'forward' | 'backward' = 'forward'
) => readings[range]
  .filter((reading) => reading.dates.includes(dateIso))
  .sort((left, right) => {
    const leftOrder = left.dateOrders[dateIso] ?? 0;
    const rightOrder = right.dateOrders[dateIso] ?? 0;
    return direction === 'forward'
      ? leftOrder - rightOrder
      : rightOrder - leftOrder;
  })
  .map((reading) => reading.readingId);

describe('monthly readings', () => {
  it('keeps the next parasha on a regular Shabbat for mincha and weekday preparation', () => {
    const readings = generateReadings({ anchorDate: '2025-10-19' });

    expect(findReading(readings, 'lastMonth', 'noach')?.dates).toContain('2025-10-18');
  });

  it('keeps the next parasha when a Yom Tov-only Shabbat still has a mincha parasha', () => {
    const readings = generateReadings({ anchorDate: '2027-06-13', isInGola: true });

    expect(findReading(readings, 'lastMonth', 'nasso')?.dates).toContain('2027-06-12');
  });

  it('uses Vezot Haberakhah for Shabbat Chol HaMoed Sukkot mincha instead of Bereshit', () => {
    const readings = generateReadings({ anchorDate: '2025-10-13' });

    expect(findReading(readings, 'lastMonth', 'vezot_haberakhah')?.dates).toContain('2025-10-11');
    expect(findReading(readings, 'lastMonth', 'bereshit')?.dates ?? []).not.toContain('2025-10-11');
  });

  it('uses the Israel Sukkot day id for Shabbat Chol HaMoed maftir', () => {
    const readings = generateReadings({ anchorDate: '2025-10-13' });

    expect(findReading(readings, 'lastMonth', 'sukkot-5')?.dates).toContain('2025-10-11');
    expect(findReading(readings, 'lastMonth', 'sukkot-maftir')?.dates ?? []).not.toContain('2025-10-11');
  });

  it('uses the diaspora Sukkot day id for Shabbat Chol HaMoed maftir', () => {
    const readings = generateReadings({ anchorDate: '2025-10-13', isInGola: true });

    expect(findReading(readings, 'lastMonth', 'sukkot-5')?.dates).toContain('2025-10-11');
    expect(findReading(readings, 'lastMonth', 'sukkot-maftir')?.dates ?? []).not.toContain('2025-10-11');
  });

  it('keeps the Israel Pesach Chol HaMoed Shabbat-interruption override', () => {
    const readings = generateReadings({ anchorDate: '2023-04-11' });

    expect(findReading(readings, 'lastMonth', 'pesach-3')?.dates).toContain('2023-04-09');
    expect(findReading(readings, 'lastMonth', 'pesach-4')?.dates).toContain('2023-04-10');
    expect(findReading(readings, 'lastMonth', 'pesach-6')?.dates).toContain('2023-04-11');
  });

  it('orders Shabbat Rosh Chodesh Chanukah before Chanukah maftir', () => {
    const readings = generateReadings({ anchorDate: '2022-12-23' });

    expect(readingIdsForDate(readings, 'nextMonth', '2022-12-24')).toEqual([
      'miketz',
      'rosh-chodesh-special',
      'chanukah-6',
      'vayigash',
    ]);
    expect(readingIdsForDate(readings, 'nextMonth', '2022-12-24', 'backward')).toEqual([
      'vayigash',
      'chanukah-6',
      'rosh-chodesh-special',
      'miketz',
    ]);
  });

  it('keeps the Shabbat Chanukah main reading before Chanukah maftir', () => {
    const readings = generateReadings({ anchorDate: '2024-12-28' });

    expect(readingIdsForDate(readings, 'nextMonth', '2024-12-28')).toEqual([
      'miketz',
      'chanukah-3',
      'vayigash',
    ]);
    expect(readingIdsForDate(readings, 'lastMonth', '2024-12-28', 'backward')).toEqual([
      'vayigash',
      'chanukah-3',
      'miketz',
    ]);
  });

  it('orders Shabbat Rosh Chodesh Shekalim before Shekalim maftir', () => {
    const readings = generateReadings({ anchorDate: '2025-03-01' });

    expect(readingIdsForDate(readings, 'nextMonth', '2025-03-01')).toEqual([
      'terumah',
      'rosh-chodesh-special',
      'shekalim',
      'tetzaveh',
    ]);
    expect(readingIdsForDate(readings, 'lastMonth', '2025-03-01', 'backward')).toEqual([
      'tetzaveh',
      'shekalim',
      'rosh-chodesh-special',
      'terumah',
    ]);
  });
});