import { AttendanceData, AttendanceCell, EmployeeRow, Holiday, ProcessedRecord } from '../types';
import { buildNormalizedEmployee } from './parserUtils';
import { parseJSON } from './jsonParser';
import { flexibleParseDate, formatCanonicalDate } from '../lib/utils';

export interface ManualDay {
  /** dd-MMM-yyyy */
  date: string;
  /** HH:MM (24h) */
  timeIn: string;
  timeOut: string;
}

export interface ManualEntry {
  erp: string;
  name: string;
  designation: string;
  basicPay?: number;
  days: ManualDay[];
}

/** Turn a manual entry into the same daily-record rows the JSON parser reads. */
export function manualEntryToRows(entry: ManualEntry): Record<string, unknown>[] {
  return entry.days.map((d) => ({
    erp: entry.erp,
    fullName: entry.name,
    designation: entry.designation,
    basicPay: entry.basicPay ?? 0,
    date: d.date,
    checkIn: d.timeIn,
    checkOut: d.timeOut,
  }));
}

const canon = (d: string) => {
  const p = flexibleParseDate(d);
  return isNaN(p.getTime()) ? d : formatCanonicalDate(p);
};

/**
 * Merge freshly parsed records into the data already loaded.
 * - Employee already loaded: their days are added; a day that exists on both sides takes the incoming values.
 *   Name, designation and basic pay of the loaded employee are kept.
 * - Employee not loaded yet: added as a new employee.
 */
export function mergeRecords(
  existing: AttendanceData,
  incoming: AttendanceData,
): { data: AttendanceData; addedEmployees: number; updatedEmployees: number; days: number } {
  const byErp = new Map<string, EmployeeRow>(existing.employees.map((e) => [e.erp, e]));
  let added = 0;
  let updated = 0;
  let days = 0;

  for (const inc of incoming.employees) {
    const cur = byErp.get(inc.erp);
    const incDays = new Set<string>([
      ...Object.keys(inc.attendance || {}).map(canon),
      ...(inc.precalculatedRecords || []).map((r) => canon(r.date)),
    ]);
    days += incDays.size;

    if (!cur) {
      byErp.set(inc.erp, inc);
      added++;
      continue;
    }

    const attendance: Record<string, AttendanceCell> = {};
    Object.entries(cur.attendance || {}).forEach(([k, v]) => {
      if (!incDays.has(canon(k))) attendance[k] = v;
    });
    Object.entries(inc.attendance || {}).forEach(([k, v]) => (attendance[k] = v));

    const keptRecords = (cur.precalculatedRecords || []).filter((r) => !incDays.has(canon(r.date)));
    const records: ProcessedRecord[] = [...keptRecords, ...(inc.precalculatedRecords || [])];
    const holidayDates = Array.from(new Set([...(cur.holidayDates || []), ...(inc.holidayDates || [])]));

    byErp.set(
      inc.erp,
      buildNormalizedEmployee({
        erp: cur.erp,
        name: cur.name,
        designation: cur.designation,
        attendance,
        category: cur.category,
        isSupport: cur.isSupport,
        basicPay: cur.basicPay,
        precalculatedRecords: records,
        holidayDates,
      }),
    );
    updated++;
  }

  const employees = Array.from(byErp.values());
  const dates = Array.from(new Set([...existing.dates, ...incoming.dates].map(canon))).sort(
    (a, b) => flexibleParseDate(a).getTime() - flexibleParseDate(b).getTime(),
  );
  const holidays: Holiday[] = [...(existing.holidays || [])];
  const have = new Set(holidays.map((h) => h.date));
  (incoming.holidays || []).forEach((h) => {
    if (!have.has(h.date)) holidays.push(h);
  });

  const data = Object.assign([...employees], {
    dates,
    employees,
    holidays,
    sourceType: 'json' as const,
    warnings: [...(existing.warnings || []), ...(incoming.warnings || [])],
  }) as AttendanceData;

  return { data, addedEmployees: added, updatedEmployees: updated, days };
}

export { parseJSON };
