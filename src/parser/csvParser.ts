import { AttendanceData } from '../types';
import { flexibleParseDate, formatCanonicalDate } from '../lib/utils';
import { parseJSON } from './jsonParser';

/**
 * Records CSV (Settings > Backup / Reset > Add employee records).
 *
 *   erp,name,designation,01-08-2026,02-08-2026,...,31-08-2026
 *   4747,tariq butt,electrician,0800:1600,0800:1600,...,0800:1600
 *
 * - Date columns are dd-mm-yyyy (day first). They are converted to dd-MMM-yyyy.
 * - A cell is `HHMM:HHMM` (In:Out). An empty cell (or `-`) means no attendance that day.
 * - Category, basic pay and the rest are chosen in the UI, never in the CSV.
 */

/** Split one CSV line, honouring double quotes. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Strict dd-mm-yyyy → dd-MMM-yyyy, or null when it is not a real calendar date. */
export function csvHeaderToCanonical(h: string): string | null {
  const m = h.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return formatCanonicalDate(date);
}

const HHMM = /^(\d{3,4})\s*:\s*(\d{3,4})$/;

function toClock(v: string): string | null {
  const n = +v;
  const h = Math.floor(n / 100);
  const m = n % 100;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseRecordsCSV(text: string, shiftDurationHours = 8): AttendanceData {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('CSV: expected a header line and at least one employee row.');

  const header = splitLine(lines[0]);
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name);
  const iErp = col('erp');
  const iName = col('name');
  const iDes = col('designation');
  if (iErp < 0 || iName < 0 || iDes < 0) {
    throw new Error('CSV: the header must start with erp, name, designation, followed by date columns (dd-mm-yyyy).');
  }

  const warnings: string[] = [];
  const dateCols: { index: number; date: string }[] = [];
  const seen = new Set<string>();
  header.forEach((h, index) => {
    if (index === iErp || index === iName || index === iDes) return;
    const date = csvHeaderToCanonical(h);
    if (!date) {
      if (h) warnings.push(`Column "${h}" is not a dd-mm-yyyy date — ignored.`);
      return;
    }
    if (seen.has(date)) {
      warnings.push(`Column "${h}" repeats ${date} — ignored.`);
      return;
    }
    seen.add(date);
    dateCols.push({ index, date });
  });
  if (dateCols.length === 0) throw new Error('CSV: no dd-mm-yyyy date columns found in the header.');

  const rows: Record<string, unknown>[] = [];
  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line);
    const lineNo = i + 2;
    const erp = cells[iErp] ?? '';
    if (!erp) {
      warnings.push(`Line ${lineNo}: missing ERP — skipped.`);
      return;
    }
    let days = 0;
    for (const { index, date } of dateCols) {
      const cell = (cells[index] ?? '').trim();
      if (!cell || cell === '-') continue;
      const m = cell.match(HHMM);
      const timeIn = m ? toClock(m[1]) : null;
      const timeOut = m ? toClock(m[2]) : null;
      if (!timeIn || !timeOut) {
        warnings.push(`Line ${lineNo} (ERP ${erp}), ${date}: "${cell}" is not HHMM:HHMM — skipped.`);
        continue;
      }
      rows.push({
        erp,
        fullName: cells[iName] || erp,
        designation: cells[iDes] || 'Staff',
        date,
        checkIn: timeIn,
        checkOut: timeOut,
      });
      days++;
    }
    if (days === 0) warnings.push(`Line ${lineNo} (ERP ${erp}): no attendance cells — skipped.`);
  });

  if (rows.length === 0) throw new Error('CSV: no valid attendance cells found.');

  const data = parseJSON(rows, '', shiftDurationHours);
  data.warnings = [...warnings, ...(data.warnings ?? [])];
  return data;
}

/** A header-only CSV for the given dates (any parseable format) so people can fill it in. */
export function buildRecordsTemplate(dates: string[]): string {
  const cols = dates
    .map((d) => flexibleParseDate(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}-${mm}-${d.getFullYear()}`;
    });
  return ['erp', 'name', 'designation', ...cols].join(',') + '\n';
}
