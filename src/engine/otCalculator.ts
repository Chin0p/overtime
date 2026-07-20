import { 
  ParsedCSV, 
  ProcessedEmployee, 
  OTSettings, 
  Holiday, 
  ProcessedRecord,
  EmployeeCategory
} from '../types';
import { getHolidayName } from './holidayChecker';
import { parseHHMM, flexibleParseDate } from '../lib/utils';
import { round } from '../lib/math';
import { format } from 'date-fns';

export function processEmployees(
  data: ParsedCSV,
  settings: OTSettings,
  basicPayMap: Record<string, number>,
  gazettedHolidays: Holiday[]
): ProcessedEmployee[] {
  const { employees, dates } = data;
  const { policy } = settings;
  const roundingMode = policy.roundingMode || 'floor';

  const globalOfficeStart = parseHHMM(policy.officeTiming?.start || '09:00');
  const globalOfficeEnd = parseHHMM(policy.officeTiming?.end || '17:00');
  const globalOfficeDuration = globalOfficeEnd - globalOfficeStart;

  const nonOfficers = employees.filter(emp => {
    const category = policy.designationCategories[emp.designation];
    if (category === 'exempt') return false;
    if (!category && emp.designation.toLowerCase().includes('officer')) return false;
    return true;
  });

  return nonOfficers.map(emp => {
    let category: EmployeeCategory = policy.designationCategories[emp.designation] || 'official';
    const rateType = policy.designationRateTypes?.[emp.designation] || (category === 'support' ? 'fixed' : 'dynamic');
    const isSupport = category === 'support';
    const isFixedRate = rateType === 'fixed';
    const isExempt = category === 'exempt'; // Should be false now, but keep for safety
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

      if (policy.lateArrivalToggle && timeIn > officeStart) {
        adjustment = timeIn - officeStart;
      }

      if (!isExempt) {
        if (isDayHoliday) {
          if (totalWorkedHours >= policy.minThreshold) {
            if (isFixedRate) {
              amount = policy.support.holidayRate;
            } else {
              amount = round(basicPay / 30, roundingMode);
            }
          }
          otHours = 0;
        } else {
          const rawOT = round(timeOut - officeEnd, roundingMode);
          
          if (rawOT >= policy.minThreshold && timeIn <= officeStart + adjustment) {
            if (isSupport) {
              otHours = Math.min(rawOT, policy.support.dailyOTCap);
              if (isFixedRate) {
                amount = round(Math.min(otHours * policy.support.hourlyRate, policy.support.maxDailyAmount), roundingMode);
              } else {
                const hourlyRate = round(basicPay / 176, roundingMode);
                amount = round(Math.min(otHours * hourlyRate, policy.support.maxDailyAmount), roundingMode);
              }
            } else {
              const hourlyRate = round(basicPay / 176, roundingMode);
              otHours = Math.min(rawOT, policy.official.dailyOTCap);
              amount = round(Math.min(otHours * hourlyRate, policy.official.maxDailyAmount), roundingMode);
            }
          }
        }
      }

      if (amount > 0 || otHours > 0 || isDayHoliday || adjustment > 0) {
        records.push({
          date: format(dateObj, 'dd-MMM-yyyy'),
          dayName,
          timeIn: attendance.timeIn,
          timeOut: attendance.timeOut,
          totalWorkedHours: round(totalWorkedHours, roundingMode),
          workedHours: round(workedHours, roundingMode),
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

    let finalRecords = records;
    if (!isSupport && !isExempt) {
      const workingDays = records.filter(r => !r.isHoliday && r.amount > 0);
      const others = records.filter(r => r.isHoliday || r.amount === 0);
      
      if (workingDays.length > policy.official.monthlyDayCap) {
        const cappedWorkingDays = workingDays
          .sort((a, b) => b.otHours - a.otHours)
          .slice(0, policy.official.monthlyDayCap);

        finalRecords = [...cappedWorkingDays, ...others].sort((a, b) => {
          return flexibleParseDate(a.date).getTime() - flexibleParseDate(b.date).getTime();
        });
      }
    }

    const totalOTHours = round(finalRecords.reduce((sum, r) => sum + r.otHours, 0), roundingMode);
    const totalAmount = round(finalRecords.reduce((sum, r) => sum + r.amount, 0), roundingMode);

    return {
      erp: emp.erp,
      name: emp.name,
      designation: emp.designation,
      category,
      basicPay,
      records: finalRecords,
      totalOTHours,
      totalAmount,
      isSupport,
      rateType: (isFixedRate ? 'fixed' : 'dynamic') as 'fixed' | 'dynamic'
    };
  }).filter(emp => emp.totalOTHours >= 1 || emp.records.some(r => r.isHoliday && r.amount > 0)); 
}
