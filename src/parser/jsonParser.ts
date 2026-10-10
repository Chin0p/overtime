import { AttendanceData, EmployeeCategory, EmployeeRow, AttendanceCell, ProcessedRecord, Holiday } from '../types';
import { buildNormalizedEmployee, inferIsSupport } from './parserUtils';
import { flexibleParseDate, formatCanonicalDate, stripSentinel } from '../lib/utils';
import { format } from 'date-fns';

// ------------------------------------------------------------------
// Field readers
// ------------------------------------------------------------------

const pick = (o: any, keys: string[]) => {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const num = (v: any, fallback = 0) => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? fallback : n;
};

const bool = (v: any) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(s)) return true;
  if (['0', 'false', 'no', 'n'].includes(s)) return false;
  return undefined;
};

// ------------------------------------------------------------------
// Value parsers
// ------------------------------------------------------------------

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

/** True when y-m-d is a real calendar date (no rolling 31 Feb into March). */
function realDate(y: number, m: number, d: number): Date | null {
  const date = new Date(y, m, d);
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : null;
}

// HARD RULE: whatever the source looks like, a date leaves here as a real calendar date (the caller
// writes it as dd-MMM-yyyy) or as null (the row is skipped with a warning). Nothing is guessed or rolled over.
//   DAUMS "08/01/2026 00:00:00"  month-first, the ONLY month-first format accepted
//   "01-Aug-2026", "2026-08-01", "01-08-2026" / "01.08.2026" (day-first), or a bare day number
export function toDate(v: any, ctx: string): Date | null {
  if (!v) return null;
  const s = String(v).trim();

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|T|$)/);
  if (us) return realDate(+us[3], +us[1] - 1, +us[2]);

  const named = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s|$)/);
  if (named) {
    const mi = MONTHS.indexOf(named[2].toLowerCase());
    return mi >= 0 ? realDate(+named[3], mi, +named[1]) : null;
  }

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s|T|$)/);
  if (iso) return realDate(+iso[1], +iso[2] - 1, +iso[3]);

  const dmy = s.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})(?:\s|$)/);
  if (dmy) return realDate(+dmy[3], +dmy[2] - 1, +dmy[1]);

  // Day-of-month only: month (and year) must come from the file name.
  // No month in the name → null (row is skipped with a warning) rather than a silent guess.
  if (/^\d{1,2}$/.test(s)) {
    const monthMatch = ctx.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
    if (!monthMatch) return null;
    const y = +(ctx.match(/\b(20\d\d)\b/)?.[1] ?? new Date().getFullYear());
    return realDate(y, MONTHS.indexOf(monthMatch[1]), +s);
  }

  return null;
}

// HARD RULE: a punch leaves here as 24-hour "HH:mm", or null when the value is not a real clock time
// ("13:20 PM", "10:75", "24:10" are rejected). Callers treat empty values as "no punch" before calling.
//   "10:17:40 AM" | "10:17 PM" | "1017" | "10:17" | "10:17:40"
export function toTime(v: any): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const ok = (h: number, m: number, sec = 0) => h >= 0 && h <= 23 && m >= 0 && m <= 59 && sec >= 0 && sec <= 59;
  const out = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const ap = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ap) {
    const h12 = +ap[1], m = +ap[2], sec = ap[3] ? +ap[3] : 0;
    if (h12 < 1 || h12 > 12 || m > 59 || sec > 59) return null;
    const pm = ap[4].toUpperCase() === 'PM';
    return out(pm ? (h12 % 12) + 12 : h12 % 12, m);
  }

  const compact = s.match(/^(\d{1,2})(\d{2})$/);
  if (compact) return ok(+compact[1], +compact[2]) ? out(+compact[1], +compact[2]) : null;

  const hm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hm) return ok(+hm[1], +hm[2], hm[3] ? +hm[3] : 0) ? out(+hm[1], +hm[2]) : null;

  return null;
}

/** An explicit category in the source. Only the three known values count; anything else is ignored. */
function declaredCategory(v: unknown): EmployeeCategory | undefined {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'exempt' || s === 'support' || s === 'official' ? s : undefined;
}

// ------------------------------------------------------------------
// Main entry
// ------------------------------------------------------------------

export function parseJSON(
  input: string | unknown,
  ctx = '',
  shiftDurationHours = 8,
): AttendanceData {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  const rows: Record<string, any>[] = Array.isArray(parsed)
    ? parsed
    : parsed?.records ?? parsed?.data ?? parsed?.attendance ?? [];

  if (rows.length === 0) throw new Error('JSON parser: expected a non-empty array of daily records.');

  const warnings: string[] = [];

  type Emp = {
    erp: string;
    name: string;
    designation: string;
    isSupport: boolean;
    /** The category the source stated, if any (exempt included). Settings still override it. */
    category?: EmployeeCategory;
    basicPay: number;
    records: ProcessedRecord[];
  };

  const employees = new Map<string, Emp>();
  const dates = new Set<string>();
  const holidays = new Map<string, string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const erp = String(pick(row, ['erp', 'ERP', 'employeeId', 'empNo', 'id']) ?? '').trim();
    if (!erp) {
      warnings.push(`Row ${rowNum}: missing ERP — skipped.`);
      return;
    }

    const dt = toDate(pick(row, ['weekDate', 'date', 'Date', 'dayDate', 'attendance_date']), ctx);
    if (!dt) {
      warnings.push(`Row ${rowNum} (ERP ${erp}): unparseable date — skipped.`);
      return;
    }

    const date = formatCanonicalDate(dt);
    const dayName = String(pick(row, ['weekDay', 'dayName', 'day_name']) ?? format(dt, 'EEEE'));

    // --- Create employee once ---
    if (!employees.has(erp)) {
      const name = String(pick(row, ['fullName', 'name', 'employee_name']) ?? erp).trim();
      const designation = String(pick(row, ['designation', 'role', 'title', 'position']) ?? 'Staff').trim();
      const isSupport = inferIsSupport(
        bool(pick(row, ['isSupport', 'is_support'])),
        pick(row, ['category', 'staffCategory', 'staff_category']),
        designation,
      );
      const basicPay = num(pick(row, ['basicPay', 'basic_pay', 'salary', 'basic']));
      const category = declaredCategory(pick(row, ['category', 'staffCategory', 'staff_category']));

      employees.set(erp, {
        erp,
        name,
        designation,
        isSupport,
        category,
        basicPay,
        records: [],
      });
    }
    const emp = employees.get(erp)!;

    // --- Times ---
    // An empty or placeholder value ("-", "N/A") means no punch; a value that is not a real clock time
    // skips the row with a warning instead of being treated as "no punch".
    const clock = (keys: string[], label: string): string | null => {
      const raw = stripSentinel(pick(row, keys));
      if (!raw) return '';
      const t = toTime(raw);
      if (t === null) warnings.push(`Row ${rowNum} (ERP ${erp}, ${date}): ${label} "${raw}" is not a valid time — skipped.`);
      return t;
    };
    const timeIn = clock(['checkIn', 'timeIn', 'time_in', 'in', 'in_time'], 'check-in');
    const timeOut = clock(['checkOut', 'timeOut', 'time_out', 'out', 'out_time'], 'check-out');
    if (timeIn === null || timeOut === null) return;

    // Hours and amounts in the source are never used: the engine calculates every
    // duration, OT hour and amount from the In/Out times and the policy.

    // --- Status / holiday ---
    const status = String(pick(row, ['status']) ?? '').trim();
    const isHoliday = bool(pick(row, ['isHoliday', 'is_holiday'])) === true || status === 'H';
    // Holiday wording is added by the engine from Settings; the file only supplies its own remarks.
    const remarks = String(pick(row, ['remarks', 'remark']) ?? '');

    if (isHoliday) holidays.set(date, 'Holiday');
    dates.add(date);

    // The file's shift start (e.g. 08:10) is kept as is. The engine works out the office start and end
    // from it, the grace and the shift duration, so nothing about office timing is decided here.
    const rawShiftStart = stripSentinel(pick(row, ['shiftStart', 'officeStart', 'shift_start']));
    const officeStart = rawShiftStart ? toTime(rawShiftStart) ?? '' : '';

    emp.records.push({
      date,
      dayName,
      timeIn,
      timeOut,
      totalWorkedHours: 0,
      workedHours: 0,
      officeHours: shiftDurationHours,
      officeStart: officeStart || undefined,
      otHours: 0,
      adjustment: 0,
      amount: 0,
      remarks,
      isHoliday,
    });
  });

  // --- Assemble EmployeeRow[] ---
  const employeesArray: EmployeeRow[] = Array.from(employees.values()).map((e) => {
    const attendance: Record<string, AttendanceCell> = {};
    for (const r of e.records) {
      if (r.timeIn || r.timeOut) attendance[r.date] = { timeIn: r.timeIn, timeOut: r.timeOut };
    }

    return buildNormalizedEmployee({
      erp: e.erp,
      name: e.name,
      designation: e.designation,
      attendance,
      isSupport: e.isSupport,
      category: e.category,
      basicPay: e.basicPay,
      precalculatedRecords: e.records,
      holidayDates: Array.from(holidays.keys()),
    });
  });

  if (dates.size === 0) {
    throw new Error('JSON parser: no parseable dates found in the file.');
  }

  const dateList = Array.from(dates).sort(
    (a, b) => flexibleParseDate(a).getTime() - flexibleParseDate(b).getTime(),
  );

  const holidayList: Holiday[] = Array.from(holidays, ([date, name]) => ({ date, name }));

  return Object.assign([...employeesArray], {
    dates: dateList,
    employees: employeesArray,
    holidays: holidayList,
    sourceType: 'json' as const,
    warnings,
  }) as AttendanceData;
}