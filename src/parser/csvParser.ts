import { ParsedCSV, EmployeeRow, OfficeTiming } from '../types';
import { parseAttendanceCell } from './cellParser';
import { parseHHMM } from '../lib/utils';

export function parseCSV(csvText: string): ParsedCSV {
  const rows = csvText.split(/\r?\n/).map(row => {
    // Simple CSV split that handles quotes if necessary
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }).filter(row => row.length > 1);

  if (rows.length < 3) {
    throw new Error('Invalid CSV format: Expected at least 3 rows (headers, timings, data)');
  }

  const headerRow = rows[0];
  const timingRow = rows[1];
  const dataRows = rows.slice(2);

  // Extract dates from Row 1, Columns 4+
  const rawDates = headerRow.slice(3).map(d => d.trim());
  const dates: string[] = [];

  for (const d of rawDates) {
    if (!d) continue;
    // Allow various date formats, normalization is handled later by flexibleParseDate
    if (!d.match(/^\d{1,2}[-/][a-zA-Z0-9]{2,3}[-/]\d{2,4}$/)) {
      throw new Error(`Invalid date format: "${d}". Expected a format like dd-MMM-yyyy or dd/mm/yyyy`);
    }
    dates.push(d);
  }
  
  if (dates.length === 0) {
    throw new Error('No valid dates found in the header row.');
  }

  // Extract office timings from Row 2, Columns 4+
  const officeTimings: Record<string, OfficeTiming> = {};
  
  dates.forEach((date) => {
    const originalIndex = headerRow.findIndex(h => h.trim() === date);
    if (originalIndex === -1) return;
    const timingStr = timingRow[originalIndex]?.trim();
    
    if (!timingStr) {
      throw new Error(`Missing office timing for date: ${date}.`);
    }
    
    if (!timingStr.match(/^\d{4}-\d{4}$/)) {
      throw new Error(`Malformed office timing for date ${date}: "${timingStr}". Expected HHMM-HHMM`);
    }

    const [startRaw, endRaw] = timingStr.split('-');
    
    const formatTime = (t: string) => {
      const clean = t.trim().padStart(4, '0');
      return `${clean.slice(0, 2)}:${clean.slice(2)}`;
    };
    
    const start = formatTime(startRaw);
    const end = formatTime(endRaw);
    
    const durationHours = parseHHMM(end) - parseHHMM(start);
    officeTimings[date] = { start, end, durationHours };
  });

  // Extract employees from Row 3+
  const employees: EmployeeRow[] = dataRows.map(row => {
    const erp = row[0];
    const name = row[1].split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    const designation = row[2];
    const attendance: Record<string, any> = {};

    dates.forEach((date) => {
      const originalIndex = headerRow.findIndex(h => h.trim() === date);
      if (originalIndex === -1) return;
      const cell = row[originalIndex];
      const parsed = parseAttendanceCell(cell);
      if (parsed) {
        attendance[date] = parsed;
      }
    });

    return { erp, name, designation, attendance };
  }).filter(emp => emp.erp && emp.name);

  return { dates, officeTimings, employees };
}
