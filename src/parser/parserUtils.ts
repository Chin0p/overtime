import { EmployeeCategory, EmployeeDetails, EmployeeRow, AttendanceCell, ProcessedRecord, OTSettings } from '../types';
import { toTitleCase } from '../lib/utils';

export const SUPPORT_DESIGNATION_KEYWORDS = [
  'driver', 'naib qasid', 'qasid', 'peon', 'daftari', 'cook', 'security guard',
  'guard', 'sweeper', 'sanitary', 'dispatch rider', 'attendant', 'electrician',
  'plumber', 'gardener', 'mali', 'waiter', 'bearer', 'janitor', 'helper', 'messenger',
  'chowkidar', 'office boy', 'rider', 'technician', 'operator', 'support'
];

const TITLE_PREFIXES = /^(mr|mrs|miss|ms)\.?\s+/i;

function stripTitle(raw: string): string {
  return raw.replace(TITLE_PREFIXES, '').trim();
}

function normalizeName(raw: string): string {
  return toTitleCase(stripTitle(raw));
}

function normalizeText(raw: string): string {
  return toTitleCase(raw);
}

/**
 * Only Driver and Naib Qasid (and Qasid) have fixed rates by default.
 * All other support staff and official staff have dynamic rates.
 */
export function isFixedRateRole(designation: string): boolean {
  const d = (designation || '').toLowerCase().trim();
  return d.includes('driver') || d.includes('naib qasid') || d.includes('qasid');
}

export function isDriver(designation: string): boolean {
  return /driver/i.test(designation || '');
}

/**
 * Rate type is a pure function of (designation, policy).
 * Source JSON and basicPay are intentionally NOT consulted.
 * DesignationsTab writes designationRateTypes; the role default fills gaps.
 */
export function resolveRateType(
  designation: string,
  policy: Pick<OTSettings['policy'], 'designationRateTypes'>,
): 'fixed' | 'dynamic' {
  return (
    policy.designationRateTypes?.[designation]
    ?? (isFixedRateRole(designation) ? 'fixed' : 'dynamic')
  );
}

/**
 * Cap exemption only exists for fixed-rate designations.
 * Dynamic designations are always subject to the monthly day cap.
 * Falls back to `isDriver(designation)` for backwards compat.
 */
export function resolveCapExempt(
  designation: string,
  rateType: 'fixed' | 'dynamic',
  policy: Pick<OTSettings['policy'], 'designationCapExempt'>,
): boolean {
  if (rateType !== 'fixed') return false;
  return policy.designationCapExempt?.[designation] ?? isDriver(designation);
}

export function inferIsSupport(
  isSupportVal: boolean | undefined,
  categoryVal: string | undefined,
  designation: string
): boolean {
  if (isSupportVal !== undefined) return isSupportVal;
  if (categoryVal) {
    const cat = categoryVal.toLowerCase();
    if (cat.includes('support')) return true;
    if (cat.includes('official') || cat.includes('exempt')) return false;
  }
  const desLower = (designation || '').toLowerCase();
  return SUPPORT_DESIGNATION_KEYWORDS.some(kw => desLower.includes(kw));
}

export function buildNormalizedEmployee(params: {
  erp: string;
  name: string;
  designation: string;
  attendance: Record<string, AttendanceCell>;
  category?: EmployeeCategory;
  isSupport?: boolean;
  basicPay?: number;
  totalOTHours?: number;
  totalAmount?: number;
  precalculatedRecords?: ProcessedRecord[];
  holidayDates?: string[];
}): EmployeeRow {
  const erp = String(params.erp || '').trim();
  const rawName = String(params.name || erp).trim();
  const name = normalizeName(rawName) || erp;
  const designation = normalizeText(String(params.designation || 'Staff').trim());

  const isSupport = inferIsSupport(params.isSupport, params.category, designation);
  const category: EmployeeCategory = params.category || (isSupport ? 'support' : 'official');
  const basicPay = typeof params.basicPay === 'number' && !isNaN(params.basicPay) ? Math.max(0, params.basicPay) : 0;

  const attendance = params.attendance || {};
  const dates = { ...attendance };
  const precalculatedRecords = params.precalculatedRecords || [];
  const holidayDates = params.holidayDates || [];

  const details: EmployeeDetails = {
    erp,
    name,
    designation,
    dates,
    attendance,
    category,
    isSupport,
    basicPay,
    totalOTHours: typeof params.totalOTHours === 'number' ? params.totalOTHours : 0,
    totalAmount: typeof params.totalAmount === 'number' ? params.totalAmount : 0,
    precalculatedRecords,
    holidayDates
  };

  const employeeObject: EmployeeRow = {
    [erp]: details,
    ...details
  };

  return employeeObject;
}
