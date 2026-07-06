import { AttendanceCell } from '../types';

/**
 * Parses a cell in the format P(HH:MM)(HH:MM)
 */
export function parseAttendanceCell(cell: string): AttendanceCell | null {
  if (!cell || typeof cell !== 'string') return null;
  
  // Match P(HH:MM)(HH:MM) with optional spaces
  const match = cell.match(/P\s*\((\d{1,2}:\d{2})\)\s*\((\d{1,2}:\d{2})\)/);
  if (!match) return null;
  const [, timeIn, timeOut] = match;
  
  // Basic validation
  if (!timeIn || !timeOut) return null;
  
  return { timeIn, timeOut };
}
