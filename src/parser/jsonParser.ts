import { AttendanceData, EmployeeRow, AttendanceCell, ProcessedRecord, Holiday } from '../types';
import { buildNormalizedEmployee, inferIsSupport } from './parserUtils';
import { formatCanonicalDate, stripSentinel } from '../lib/utils';
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

// "08/01/2026 00:00:00" | "01-Aug-2026" | "01" -> Date
export function toDate(v: any, ctx: string): Date | null {
  if (!v) return null;
  const s = String(v).trim();

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return new Date(+us[3], +us[1] - 1, +us[2]);

  const dmy = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (dmy) {
    const mi = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(dmy[2].toLowerCase());
    if (mi >= 0) return new Date(+dmy[3], mi, +dmy[1]);
  }

  // Day-of-month, needs month/year from filename context
  if (/^\d{1,2}$/.test(s)) {
    const y = +(ctx.match(/\b(20\d\d)\b/)?.[1] ?? 2026);
    const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
      .indexOf((ctx.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/) ?? ['jan'])[1]);
    return new Date(y, m < 0 ? 0 : m, +s);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// "10:17:40 AM" | "1017" | "10:17" -> "10:17"
export function toTime(v: any): string {
  if (!v) return '';
  const s = String(v).trim();

  const ap = s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)$/i);
  if (ap) {
    let h = +ap[1];
    const m = ap[2] ?? '00';
    const pm = ap[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  if (/^\d{3,4}$/.test(s)) {
    const n = +s, h = Math.floor(n / 100), m = n % 100;
    return h < 24 && m < 60 ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : '';
  }

  const hm = s.match(/^(\d{1,2}):(\d{2})/);
  if (hm && +hm[1] < 24 && +hm[2] < 60) return `${String(+hm[1]).padStart(2, '0')}:${hm[2]}`;

  return '';
}

// "5h 42m" | 5.7 | "5:42" -> 5.7
export function toHours(v: any): number {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v).trim();
  const hm = s.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (hm) return +hm[1] + +hm[2] / 60;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function addHours(hhmm: string, h: number): string {
  const [H, M] = hhmm.split(':').map(Number);
  const total = ((H || 0) * 60 + (M || 0) + h * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ------------------------------------------------------------------
// Main entry
// ------------------------------------------------------------------

export function parseJSON(
  input: string | unknown,
  ctx = 'august-2026',
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

      employees.set(erp, {
        erp,
        name,
        designation,
        isSupport,
        basicPay,
        records: [],
      });
    }
    const emp = employees.get(erp)!;

    // --- Times ---
    const timeIn = stripSentinel(toTime(pick(row, ['checkIn', 'timeIn', 'time_in', 'in', 'in_time'])));
    const timeOut = stripSentinel(toTime(pick(row, ['checkOut', 'timeOut', 'time_out', 'out', 'out_time'])));

    // --- Hours ---
    const explicitOT = toHours(pick(row, ['otHours', 'ot_hours', 'overtimeHours', 'overtime_hours', 'ot']));
    const totalWorkedHours = toHours(pick(row, ['hours', 'totalWorkedHours', 'total_worked_hours']));
    const otHours = explicitOT > 0
      ? explicitOT
      : Math.max(0, +(totalWorkedHours - shiftDurationHours).toFixed(2));

    // --- Status / holiday ---
    const status = String(pick(row, ['status']) ?? '').trim();
    const isHoliday = bool(pick(row, ['isHoliday', 'is_holiday'])) === true || status === 'H';
    const remarks = isHoliday ? 'Holiday' : String(pick(row, ['remarks', 'remark']) ?? '');

    if (isHoliday) holidays.set(date, 'Holiday');
    dates.add(date);

    const rawShiftStart = pick(row, ['shiftStart', 'officeStart', 'shift_start']);
    const officeStart = rawShiftStart ? String(rawShiftStart).trim().slice(0, 5) : '';
    const officeEnd = officeStart ? addHours(officeStart, shiftDurationHours) : '';

    emp.records.push({
      date,
      dayName,
      timeIn,
      timeOut,
      totalWorkedHours: +totalWorkedHours.toFixed(2),
      workedHours: otHours,
      officeHours: shiftDurationHours,
      officeTiming: officeStart ? `${officeStart.replace(':', '')}-${officeEnd.replace(':', '')}` : undefined,
      officeStart: officeStart || undefined,
      officeEnd: officeEnd || undefined,
      otHours,
      adjustment: 0,
      amount: num(pick(row, ['amount', 'otAmount', 'ot_amount'])),
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
      basicPay: e.basicPay,
      precalculatedRecords: e.records,
      holidayDates: Array.from(holidays.keys()),
    });
  });

  if (dates.size === 0) {
    throw new Error('JSON parser: no parseable dates found in the file.');
  }

  const dateList = Array.from(dates).sort((a, b) => {
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    return ta - tb;
  });

  const holidayList: Holiday[] = Array.from(holidays, ([date, name]) => ({ date, name }));

  return Object.assign([...employeesArray], {
    dates: dateList,
    employees: employeesArray,
    holidays: holidayList,
    sourceType: 'json' as const,
    warnings,
  }) as AttendanceData;
}
