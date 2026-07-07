import { HDate } from '@hebcal/hdate';
import type { CalendarDateDisplayOption } from '@/stores/options';

const parseIsoDateAtNoon = (dateIso: string): Date | null => {
  const parsedDate = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate;
};

const shouldUseHebrewScript = (locale: string): boolean => locale.toLowerCase().startsWith('he');

const formatHebrewCalendarDate = (date: Date, locale: string): string => {
  const hebrewDate = new HDate(date);

  if (shouldUseHebrewScript(locale)) {
    return hebrewDate.renderGematriya(true, true);
  }

  return `${hebrewDate.getDate()} ${hebrewDate.getMonthName()}`;
};

const formatGregorianCalendarDate = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatCalendarDateLabel = (
  dateIso: string,
  calendarDateDisplay: CalendarDateDisplayOption,
  locale: string
): string => {
  const parsedDate = parseIsoDateAtNoon(dateIso);
  if (!parsedDate) return dateIso;

  if (calendarDateDisplay === 'hebrew') {
    return formatHebrewCalendarDate(parsedDate, locale);
  }

  return formatGregorianCalendarDate(parsedDate, locale);
};

export { formatCalendarDateLabel };
