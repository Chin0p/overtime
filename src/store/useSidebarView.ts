import { useState } from 'react';
import { ProcessedEmployee } from '../types';
import { flexibleParseDate } from '../lib/utils';

/**
 * Filters for the employee list. They combine with AND: an employee has to match every active
 * filter. Inside the Overtime filter every chosen test has to hold ("has hours" and "has amount");
 * "none" stands alone. "Holiday availed" matches an employee who attended on ANY of the chosen holidays.
 */
export type OvertimeFilter = 'hours' | 'amount' | 'none';
export type PayFilter = 'any' | 'dynamic' | 'fixed' | 'missing';

export interface SidebarFilters {
  /** hours: total OT hours above zero. amount: total amount above zero (holiday pay counts). none: neither. */
  overtime: OvertimeFilter[];
  eligibility: 'any' | 'paid' | 'exempt';
  category: 'any' | 'official' | 'support';
  /** missing: a dynamic-rate, non-exempt employee with no basic pay. */
  pay: PayFilter;
  hasExcluded: boolean;
  /** Canonical dates (dd-MMM-yyyy) of chosen holidays, plus WEEKEND_KEY for Saturdays and Sundays. */
  holidays: string[];
}

export const WEEKEND_KEY = 'weekend';

// No filter is on by default: the list shows everyone, and filters are added as needed.
export const DEFAULT_FILTERS: SidebarFilters = {
  overtime: [],
  eligibility: 'any',
  category: 'any',
  pay: 'any',
  hasExcluded: false,
  holidays: [],
};
export const NO_FILTERS: SidebarFilters = DEFAULT_FILTERS;

export type SidebarSortKey = 'file' | 'name' | 'designation' | 'ot' | 'amount';
export type SidebarSortOrder = 'asc' | 'desc';

/**
 * How the employee list is narrowed and ordered. Lives in App (like the records view) so the
 * first employee that gets auto-selected is the first one the list actually shows.
 */
export function useSidebarView() {
  const [filters, setFilters] = useState<SidebarFilters>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SidebarSortKey>('file');
  const [sortOrder, setSortOrder] = useState<SidebarSortOrder>('asc');
  const setSort = (key: SidebarSortKey, order: SidebarSortOrder) => {
    setSortKey(key);
    setSortOrder(order);
  };
  return { filters, setFilters, sortKey, sortOrder, setSort };
}

export type SidebarView = ReturnType<typeof useSidebarView>;

export interface HolidayOption {
  /** Canonical date, or WEEKEND_KEY. */
  key: string;
  label: string;
}

const isWeekendName = (name?: string | null) => name === 'Saturday' || name === 'Sunday';

/** The holidays present in the loaded data (named ones), plus one option for Saturdays and Sundays. */
export function buildHolidayOptions(employees: ProcessedEmployee[]): HolidayOption[] {
  const named = new Map<string, string>();
  let weekends = false;
  employees.forEach((emp) =>
    emp.records.forEach((r) => {
      if (!r.isHoliday) return;
      if (isWeekendName(r.holidayName)) weekends = true;
      else if (!named.has(r.date)) named.set(r.date, r.holidayName || 'Holiday');
    }),
  );
  const list: HolidayOption[] = Array.from(named.entries())
    .sort((a, b) => flexibleParseDate(a[0]).getTime() - flexibleParseDate(b[0]).getTime())
    .map(([date, name]) => ({ key: date, label: `${name} · ${date}` }));
  if (weekends) list.push({ key: WEEKEND_KEY, label: 'Saturdays & Sundays' });
  return list;
}

const punched = (t?: string) => Boolean(t) && t !== '-' && t !== '—';

/** Attended (same test the engine uses: both punches present) on a chosen holiday, and not excluded. */
function availedHoliday(emp: ProcessedEmployee, keys: string[]): boolean {
  return emp.records.some(
    (r) =>
      r.isHoliday &&
      !r.excluded &&
      punched(r.timeIn) &&
      punched(r.timeOut) &&
      (keys.includes(r.date) || (keys.includes(WEEKEND_KEY) && isWeekendName(r.holidayName))),
  );
}

export const matchesFilters = (emp: ProcessedEmployee, f: SidebarFilters): boolean => {
  const exempt = emp.category === 'exempt';
  if (f.overtime.includes('hours') && !(emp.totalOTHours > 0)) return false;
  if (f.overtime.includes('amount') && !(emp.totalAmount > 0)) return false;
  if (f.overtime.includes('none') && (emp.totalOTHours > 0 || emp.totalAmount > 0)) return false;
  if (f.eligibility === 'paid' && exempt) return false;
  if (f.eligibility === 'exempt' && !exempt) return false;
  if (f.category !== 'any' && emp.category !== f.category) return false;
  if ((f.pay === 'dynamic' || f.pay === 'fixed') && emp.rateType !== f.pay) return false;
  if (f.pay === 'missing' && !(!exempt && emp.rateType === 'dynamic' && emp.basicPay === 0)) return false;
  if (f.hasExcluded && !emp.records.some((r) => r.excluded)) return false;
  if (f.holidays.length > 0 && !availedHoliday(emp, f.holidays)) return false;
  return true;
};

export function applySidebarView(
  employees: ProcessedEmployee[],
  { filters, sortKey, sortOrder }: { filters: SidebarFilters; sortKey: SidebarSortKey; sortOrder: SidebarSortOrder },
): ProcessedEmployee[] {
  const list = employees.filter((emp) => matchesFilters(emp, filters));
  if (sortKey === 'file') return list;
  const dir = sortOrder === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    switch (sortKey) {
      case 'name': return a.name.localeCompare(b.name) * dir;
      case 'designation': return (a.designation.localeCompare(b.designation) || a.name.localeCompare(b.name)) * dir;
      case 'ot': return (a.totalOTHours - b.totalOTHours) * dir;
      default: return (a.totalAmount - b.totalAmount) * dir;
    }
  });
}
