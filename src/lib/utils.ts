import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parse, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

export function flexibleParseDate(dateStr: string): Date {
  let normalized = dateStr.trim().replace(/\//g, '-');
  
  // Normalize month part to Title Case if it's 3 letters (e.g. JAN -> Jan)
  const parts = normalized.split('-');
  if (parts.length === 3 && parts[1].length === 3 && isNaN(Number(parts[1]))) {
    parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    normalized = parts.join('-');
  }

  // Try dd-MMM-yyyy first (e.g. 12-Jan-2025)
  let date = parse(normalized, 'dd-MMM-yyyy', new Date());
  if (isValid(date) && date.getFullYear() > 2000) return date;

  // Try dd-MMM-yy (e.g. 12-Jan-25)
  date = parse(normalized, 'dd-MMM-yy', new Date());
  if (isValid(date) && date.getFullYear() > 2000) return date;

  // Try dd-MM-yyyy (e.g. 12-01-2025)
  date = parse(normalized, 'dd-MM-yyyy', new Date());
  if (isValid(date) && date.getFullYear() > 2000) return date;
  
  // Try dd-MM-yy (e.g. 12-01-25)
  date = parse(normalized, 'dd-MM-yy', new Date());
  if (isValid(date) && date.getFullYear() > 2000) return date;

  // Try MM-dd-yyyy
  date = parse(normalized, 'MM-dd-yyyy', new Date());
  if (isValid(date) && date.getFullYear() > 2000) return date;

  // Try yyyy-MM-dd
  date = parse(normalized, 'yyyy-MM-dd', new Date());
  if (isValid(date) && date.getFullYear() > 2000) return date;

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
