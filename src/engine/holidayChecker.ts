import { isSaturday, isSunday } from 'date-fns';
import { Holiday } from '../types';
import { flexibleParseDate } from '../lib/utils';

export function getHolidayName(dateStr: string, gazettedHolidays: Holiday[]): string | null {
  const date = flexibleParseDate(dateStr);
  if (isNaN(date.getTime())) return null;
  const normalizedTarget = date.getTime();
  
  // Check gazetted holidays
  const gazetted = gazettedHolidays.find(h => {
    const hDate = flexibleParseDate(h.date);
    return !isNaN(hDate.getTime()) && hDate.getTime() === normalizedTarget;
  });
  
  if (gazetted) return gazetted.name;

  // Check weekends
  if (isSaturday(date)) return 'Saturday';
  if (isSunday(date)) return 'Sunday';

  return null;
}

export function isHoliday(dateStr: string, gazettedHolidays: Holiday[]): boolean {
  return getHolidayName(dateStr, gazettedHolidays) !== null;
}
