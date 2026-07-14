import { ParsedCSV, EmployeeRow } from '../types';
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

  if (rows.length < 2) {
    throw new Error('Invalid CSV format: Expected at least 2 rows (headers, data)');
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

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

  // Extract employees from Row 2+
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

  return { dates, employees };
}
