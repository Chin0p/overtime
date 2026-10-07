import { isSaturday, isSunday } from 'date-fns';
import { Holiday } from '../types';
import { flexibleParseDate } from '../lib/utils';

/** Gazetted holidays keyed by day timestamp, so each date is a lookup instead of a scan + re-parse. */
export type HolidayIndex = Map<number, string>;

export function buildHolidayIndex(gazettedHolidays: Holiday[]): HolidayIndex {
  const index: HolidayIndex = new Map();
  gazettedHolidays.forEach((h) => {
    const d = flexibleParseDate(h.date);
    // First entry for a date wins, same as the old find().
    if (!isNaN(d.getTime()) && !index.has(d.getTime())) index.set(d.getTime(), h.name);
  });
  return index;
}

/** Holiday name for a date: a gazetted holiday set in Settings, else Saturday / Sunday, else null. */
export function getHolidayNameFromIndex(date: Date, index: HolidayIndex): string | null {
  if (isNaN(date.getTime())) return null;
  const gazetted = index.get(date.getTime());
  if (gazetted !== undefined) return gazetted;
  if (isSaturday(date)) return 'Saturday';
  if (isSunday(date)) return 'Sunday';
  return null;
}

export function getHolidayName(dateStr: string, gazettedHolidays: Holiday[]): string | null {
  return getHolidayNameFromIndex(flexibleParseDate(dateStr), buildHolidayIndex(gazettedHolidays));
}

export function isHoliday(dateStr: string, gazettedHolidays: Holiday[]): boolean {
  return getHolidayName(dateStr, gazettedHolidays) !== null;
}
