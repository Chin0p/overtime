import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parse, isValid } from 'date-fns';

/**
 * The single canonical date format used across L1, L2, and L3.
 * Everything that emits a date emits this. Everything that reads a date
 * must accept this.
 */
export const CANONICAL_DATE_FORMAT = 'dd-MMM-yyyy';

export function formatCanonicalDate(d: Date): string {
  return format(d, CANONICAL_DATE_FORMAT);
}

/**
 * Strips known sentinel values that mean "no value".
 * Returns '' for any sentinel, trimmed string otherwise.
 */
export function stripSentinel(v: unknown): string {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s === '-' || s === '—' || s === '–') return '';
  const lower = s.toLowerCase();
  if (lower === 'null' || lower === 'nil' || lower === 'n/a' || lower === 'na' || lower === 'undefined') return '';
  return s;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => 
      word.split('-')
        .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
        .join('-')
    )
    .join(' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseHHMM(time: string): number {
  if (!time) return 0;
  const str = String(time).trim();
  if (!str) return 0;

  // AM/PM format: e.g. "9:00 AM", "06:30 PM"
  const ampm = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const isPM = ampm[3].toUpperCase() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h + m / 60;
  }

  // Standard HH:MM or HH:MM:SS
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
  }

  // Military 4-digit: e.g. "0900", "1800"
  const milMatch = str.match(/^(\d{2})(\d{2})$/);
  if (milMatch) {
    return parseInt(milMatch[1], 10) + parseInt(milMatch[2], 10) / 60;
  }

  const [hours, minutes] = str.split(':').map(Number);
  if (!isNaN(hours)) {
    return hours + (isNaN(minutes) ? 0 : minutes / 60);
  }
  return 0;
}

const MONTH_NAMES: Record<string, string> = {
  january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', may: 'May', june: 'Jun',
  july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec'
};

// Parsing the same few dozen date strings thousands of times (per employee × per day × per
// holiday) used to dominate every recalculation. Results are cached as timestamps; each caller
// still gets its own fresh Date so nothing can mutate a shared one.
const parseCache = new Map<string, number>();

export function flexibleParseDate(dateStr: string, defaultYear: number = new Date().getFullYear()): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
  const key = `${defaultYear}|${dateStr}`;
  const hit = parseCache.get(key);
  if (hit !== undefined) return new Date(hit);
  const parsed = parseDateUncached(dateStr, defaultYear);
  if (parseCache.size > 5000) parseCache.clear();
  parseCache.set(key, parsed.getTime());
  return parsed;
}

function parseDateUncached(dateStr: string, defaultYear: number): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
  let normalized = dateStr.trim().replace(/\//g, '-').replace(/\./g, '-');

  // Strip ISO time if present (e.g. "2026-08-01T00:00:00.000Z" -> "2026-08-01")
  if (normalized.includes('T') || normalized.includes(' ')) {
    const datePart = normalized.split(/[T\s]/)[0];
    if (datePart && datePart.includes('-')) {
      normalized = datePart;
    }
  }
  
  const monthMap = MONTH_NAMES;

  const parts = normalized.split('-');
  
  // If 2-part date like "01-Aug", "1-Aug", "01-08", "1-8", append default year
  if (parts.length === 2) {
    const p1 = parts[0].trim();
    const p2 = parts[1].trim().toLowerCase();
    if (monthMap[p2]) {
      normalized = `${p1}-${monthMap[p2]}-${defaultYear}`;
    } else if (p2.length === 3 && isNaN(Number(p2))) {
      normalized = `${p1}-${p2.charAt(0).toUpperCase() + p2.slice(1)}-${defaultYear}`;
    } else if (!isNaN(Number(p1)) && !isNaN(Number(p2))) {
      normalized = `${p1}-${p2}-${defaultYear}`;
    }
  } else if (parts.length === 3) {
    const mLow = parts[1].trim().toLowerCase();
    if (monthMap[mLow]) {
      parts[1] = monthMap[mLow];
      normalized = parts.join('-');
    } else if (parts[1].length === 3 && isNaN(Number(parts[1]))) {
      parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
      normalized = parts.join('-');
    }
  }

  // Try dd-MMM-yyyy / d-MMM-yyyy first (e.g. 12-Jan-2025, 1-Aug-2026)
  let date = parse(normalized, 'dd-MMM-yyyy', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  date = parse(normalized, 'd-MMM-yyyy', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  // Try yyyy-MM-dd
  date = parse(normalized, 'yyyy-MM-dd', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  // Try dd-MM-yyyy / d-M-yyyy (e.g. 12-01-2025)
  date = parse(normalized, 'dd-MM-yyyy', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  date = parse(normalized, 'd-M-yyyy', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  // Try dd-MMM-yy / d-MMM-yy (e.g. 12-Jan-25)
  date = parse(normalized, 'dd-MMM-yy', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  date = parse(normalized, 'd-MMM-yy', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  // Try dd-MM-yy (e.g. 12-01-25)
  date = parse(normalized, 'dd-MM-yy', new Date());
  if (isValid(date) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;

  // Numeric day/month strings that got this far are not valid day-first dates. Do not let the
  // native parser reinterpret them as month-first.
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(dateStr.trim())) return new Date(NaN);

  // Fallback to Native Date constructor (e.g. "Aug 1, 2026")
  const nativeParsed = new Date(dateStr);
  if (isValid(nativeParsed) && !isNaN(nativeParsed.getTime()) && nativeParsed.getFullYear() >= 2000 && nativeParsed.getFullYear() <= 2100) {
    return nativeParsed;
  }

  return new Date(NaN); // Invalid date
}

export function formatDuration(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatTimeDisplay(raw: string): string {
  const s = stripSentinel(raw);
  if (!s) return '—';
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2)}`;
  return s;
}
