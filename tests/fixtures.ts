// Invented people and days for the tests. Nothing here comes from a real attendance file.
import { parseJSON } from '../src/parser/jsonParser';
import { DEFAULT_POLICY } from '../src/constants';
import type { AttendanceData, OTSettings } from '../src/types';

/** One day of one person, in the shape the attendance system exports. */
export interface Day {
  /** Day of September 2026 (1 September 2026 is a Tuesday). */
  d: number;
  in?: string;
  out?: string;
  /** The file's shift start. Omit for 08:10; pass null for a blank. */
  shiftStart?: string | null;
  isHoliday?: string;
  status?: string;
  remarks?: string;
}

export const sep = (d: number) => `09/${String(d).padStart(2, '0')}/2026 00:00:00`;
export const canon = (d: number) => `${String(d).padStart(2, '0')}-Sep-2026`;

export function personRows(erp: string, fullName: string, designation: string, days: Day[]): Record<string, unknown>[] {
  return days.map((x) => ({
    weekDate: sep(x.d),
    erp,
    fullName,
    designation,
    checkIn: x.in ?? '',
    checkOut: x.out ?? '',
    shiftStart: x.shiftStart === undefined ? '08:10:00' : x.shiftStart,
    isHoliday: x.isHoliday ?? '0',
    status: x.status ?? '',
    remarks: x.remarks ?? '',
  }));
}

export const load = (rows: Record<string, unknown>[]): AttendanceData => parseJSON(rows, 'test-sep-2026.json', 8);

/** The default policy with the given changes (nested official / support settings are merged). */
export function policy(over: Partial<OTSettings['policy']> = {}): OTSettings['policy'] {
  return {
    ...DEFAULT_POLICY,
    ...over,
    official: { ...DEFAULT_POLICY.official, ...(over.official ?? {}) },
    support: { ...DEFAULT_POLICY.support, ...(over.support ?? {}) },
  };
}

/** Weekdays of September 2026 that are not holidays (used for month-long patterns). */
export const WEEKDAYS = [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30];
