import { 
  ParsedCSV, 
  ProcessedEmployee, 
  OTSettings, 
  Holiday, 
  ProcessedRecord 
} from '../types';
import { getHolidayName } from './holidayChecker';
import { parseHHMM, flexibleParseDate } from '../lib/utils';
import { format } from 'date-fns';

export function processEmployees(
  data: ParsedCSV,
  settings: OTSettings,
  basicPayMap: Record<string, number>,
  gazettedHolidays: Holiday[]
): ProcessedEmployee[] {
  const { employees, dates } = data;
  const { policy } = settings;

  const globalOfficeStart = parseHHMM(policy.officeTiming?.start || '09:00');
  const globalOfficeEnd = parseHHMM(policy.officeTiming?.end || '17:00');
  const globalOfficeDuration = globalOfficeEnd - globalOfficeStart;

  return employees.map(emp => {
    const isSupport = policy.support.designations.some(d => 
      emp.designation.toLowerCase().includes(d.toLowerCase())
    );
    const basicPay = basicPayMap[emp.erp] || 0;
    const records: ProcessedRecord[] = [];

    dates.forEach(dateStr => {
      const attendance = emp.attendance[dateStr];
      const holidayName = getHolidayName(dateStr, gazettedHolidays);
      const isDayHoliday = holidayName !== null;
      
      const dateObj = flexibleParseDate(dateStr);
      if (isNaN(dateObj.getTime())) return;
      const dayName = format(dateObj, 'EEEE');

      if (!attendance) return;

      const timeIn = parseHHMM(attendance.timeIn);
      const timeOut = parseHHMM(attendance.timeOut);
      const totalWorkedHours = Math.max(0, timeOut - timeIn);
      const officeEnd = globalOfficeEnd;
      const workedHours = timeOut - officeEnd; 
      const officeHours = globalOfficeDuration;
      const officeStart = globalOfficeStart;

      let otHours = 0;
      let amount = 0;
      let adjustment = 0;

      // Late arrival adjustment
      if (policy.lateArrivalToggle && timeIn > officeStart) {
        adjustment = timeIn - officeStart;
      }

      if (isDayHoliday) {
        // Holiday Calculation
        if (isSupport) {
          amount = policy.support.holidayRate;
        } else {
          amount = basicPay / 30;
        }
        otHours = 0;
      } else {
        // Regular Day OT Calculation
        const rawOT = Math.floor(timeOut - officeEnd);
        
        if (rawOT >= policy.minThreshold) {
          if (isSupport) {
            otHours = Math.min(rawOT, policy.support.dailyOTCap);
            amount = Math.min(otHours * policy.support.hourlyRate, policy.support.maxDailyAmount);
          } else {
            const hourlyRate = basicPay / 176;
            otHours = Math.min(rawOT, policy.official.dailyOTCap);
            amount = Math.min(otHours * hourlyRate, policy.official.maxDailyAmount);
          }
        }
      }

      if (amount > 0 || otHours > 0 || isDayHoliday || adjustment > 0) {
        records.push({
          date: format(dateObj, 'dd-MMM-yyyy'),
          dayName,
          timeIn: attendance.timeIn,
          timeOut: attendance.timeOut,
          totalWorkedHours,
          workedHours,
          officeHours,
          officeTiming: `${(policy.officeTiming?.start || '09:00').replace(':', '')}-${(policy.officeTiming?.end || '17:00').replace(':', '')}`,
          otHours,
          adjustment,
          amount,
          remarks: holidayName || '',
          isHoliday: isDayHoliday
        });
      }
    });

    // Apply monthly working day cap for official staff
    let finalRecords = records;
    if (!isSupport) {
      const workingDays = records.filter(r => !r.isHoliday && r.amount > 0);
      const others = records.filter(r => r.isHoliday || r.amount === 0);
      
      if (workingDays.length > policy.official.monthlyDayCap) {
        const cappedWorkingDays = workingDays
          .sort((a, b) => b.amount - a.amount)
          .slice(0, policy.official.monthlyDayCap);
        finalRecords = [...cappedWorkingDays, ...others].sort((a, b) => {
          return flexibleParseDate(a.date).getTime() - flexibleParseDate(b.date).getTime();
        });
      }
    }

    const totalOTHours = finalRecords.reduce((sum, r) => sum + r.otHours, 0);
    const totalAmount = finalRecords.reduce((sum, r) => sum + r.amount, 0);

    return {
      erp: emp.erp,
      name: emp.name,
      designation: emp.designation,
      basicPay,
      records: finalRecords,
      totalOTHours,
      totalAmount,
      isSupport
    };
  }).filter(emp => emp.totalOTHours >= 1 || emp.records.some(r => r.isHoliday && r.amount > 0)); 
}
