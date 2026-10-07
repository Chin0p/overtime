import { Holiday } from '../types';
import { flexibleParseDate, formatCanonicalDate } from './utils';

/**
 * A file's own holiday flags are copied into Settings ONCE per date. After that Settings is the
 * only source of truth: a holiday you remove stays removed, even when the same file is loaded
 * again. Saturdays and Sundays are already off-days, so they are never listed.
 */
export function seedFileHolidays(
  fileHolidays: Holiday[] | undefined,
  alreadySeen: string[] | undefined,
  holidays: Holiday[],
): { changed: boolean; seen: string[]; holidays: Holiday[] } {
  const seen = new Set(alreadySeen || []);
  const have = new Set(holidays.map((h) => h.date));
  const next = [...holidays];
  let changed = false;
  (fileHolidays || []).forEach((h) => {
    const parsed = flexibleParseDate(h.date);
    const valid = !isNaN(parsed.getTime());
    const date = valid ? formatCanonicalDate(parsed) : h.date;
    if (seen.has(date)) return;
    seen.add(date);
    changed = true;
    const isWeekend = valid && (parsed.getDay() === 0 || parsed.getDay() === 6);
    if (!isWeekend && !have.has(date)) {
      next.push({ date, name: h.name || 'Holiday' });
      have.add(date);
    }
  });
  return { changed, seen: Array.from(seen), holidays: next };
}
