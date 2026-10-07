import { 
  AttendanceData, 
  EmployeeRow,
  ProcessedEmployee, 
  OTSettings, 
  Holiday, 
  ProcessedRecord,
  EmployeeCategory,
  AttendanceCell
} from '../types';
import { buildHolidayIndex, getHolidayNameFromIndex } from './holidayChecker';
import { parseHHMM, flexibleParseDate, toTitleCase, formatCanonicalDate } from '../lib/utils';
import { round } from '../lib/math';
import { resolveCategory, resolveRateType, resolveCapExempt } from '../parser/parserUtils';
import { format } from 'date-fns';

/** Hours between two decimal clock times, snapped to whole minutes so 17:20 - 16:20 is exactly 1. */
function hoursBetween(from: number, to: number): number {
  return Math.round((to - from) * 60) / 60;
}

/**
 * The one place that turns a raw overtime duration into payable OT hours.
 *  1. Anything under the minimum threshold is not overtime at all → 0.
 *  2. Otherwise apply the rounding mode (round / floor).
 *  3. If rounding still lands under the minimum, → 0 (so there is nothing to pay).
 * e.g. min 1 + floor: 0h36m → 0, 1h36m → 1. min 1 + round: 0h36m → 0, 1h36m → 2.
 */
export function computeOTHours(
  rawHours: number,
  minThreshold: number,
  mode: 'floor' | 'round' = 'round',
): number {
  const hours = Math.round(rawHours * 60) / 60;
  if (!(hours > 0) || hours < minThreshold) return 0;
  const rounded = round(hours, mode);
  return rounded > 0 && rounded >= minThreshold ? rounded : 0;
}

/** Late arrival is rounded with the same mode as everything else (so 30 min late is 1h under Round, 0h under Floor). */
export function lateAdjustmentHours(lateHours: number, mode: 'floor' | 'round' = 'round'): number {
  return round(lateHours, mode);
}

/** Overtime left after the late-arrival offset (hour-for-hour), before threshold and rounding. */
export function netOvertimeHours(grossOT: number, adjustment: number, lateArrivalToggle: boolean): number {
  return lateArrivalToggle ? Math.max(0, grossOT - adjustment) : grossOT;
}

/**
 * Only the policy is read here. Theme, PDF layout and the like never change a calculation, so the
 * caller does not need to (and must not) recalculate when they change.
 * Exempt employees are kept in the result with zero hours and zero amount, so the dashboard can
 * still show them; the PDF leaves them out.
 */
export function processEmployees(
  data: AttendanceData,
  settings: Pick<OTSettings, 'policy'>,
  basicPayMap: Record<string, number>,
  gazettedHolidays: Holiday[]
): ProcessedEmployee[] {
  // L1 contract: `data.dates` is populated or L1 threw.
  if (!data.dates || data.dates.length === 0) {
    throw new Error('processEmployees: data.dates is empty. L1 must emit a populated date set.');
  }
  const canonicalDates = data.dates;

  const employees = (data.employees || (Array.isArray(data) ? data : [])) as EmployeeRow[];
  const { policy } = settings;
  const roundingMode = policy.roundingMode || 'round';

  const globalOfficeStart = parseHHMM(policy.officeTiming?.start || '09:00');
  const globalOfficeEnd = parseHHMM(policy.officeTiming?.end || '17:00');
  const shiftDurationHours = policy.shiftDurationHours ?? 8;
  const globalOfficeDuration = Math.max(0, globalOfficeEnd - globalOfficeStart) || shiftDurationHours;

  // Settings is the only source of truth for holidays (gazetted dates + Saturday/Sunday). Whatever
  // a file says about holidays is copied into Settings once at upload, never read here.
  const holidayIndex = buildHolidayIndex(gazettedHolidays);

  // Everything about a calendar day that does not depend on the employee, worked out once.
  const dateInfo = canonicalDates.map(dateStr => {
    const dateObj = flexibleParseDate(dateStr);
    const valid = !isNaN(dateObj.getTime());
    return {
      dateStr,
      dateObj,
      formattedDate: valid ? formatCanonicalDate(dateObj) : dateStr,
      holidayName: getHolidayNameFromIndex(dateObj, holidayIndex),
      dayName: valid ? format(dateObj, 'EEEE') : null,
    };
  });

  const allProcessed = employees.map(emp => {
    const category: EmployeeCategory = resolveCategory(emp, policy);
    const isExempt = category === 'exempt';
    const isSupport = category === 'support';

    // Prioritize basicPayMap from settings, then fallback to emp.basicPay from uploaded file
    const erpKey = emp.erp?.trim() || '';
    const numErpKey = !isNaN(parseInt(erpKey, 10)) ? String(parseInt(erpKey, 10)) : erpKey;
    let basicPay = 0;
    if (basicPayMap[erpKey] !== undefined && basicPayMap[erpKey] > 0) {
      basicPay = basicPayMap[erpKey];
    } else if (basicPayMap[numErpKey] !== undefined && basicPayMap[numErpKey] > 0) {
      basicPay = basicPayMap[numErpKey];
    } else if (basicPayMap[emp.erp] !== undefined && basicPayMap[emp.erp] > 0) {
      basicPay = basicPayMap[emp.erp];
    } else if (emp.name && basicPayMap[emp.name] !== undefined && basicPayMap[emp.name] > 0) {
      basicPay = basicPayMap[emp.name];
    } else if (emp.basicPay !== undefined && emp.basicPay > 0) {
      basicPay = emp.basicPay;
    }

    // Rate type is a pure function of designation + policy.
    // Source JSON and basicPay are intentionally NOT consulted.
    const rateType = resolveRateType(emp.designation, policy);
    const isFixedRate = rateType === 'fixed';

    const hourlyRate = round(basicPay / 176, roundingMode);
    const holidayRate = round(basicPay / 30, roundingMode);
    const effectiveHourlyRate = isFixedRate ? policy.support.hourlyRate : (basicPay > 0 ? hourlyRate : 0);
    const effectiveDayRate = isFixedRate ? policy.support.holidayRate : (basicPay > 0 ? holidayRate : 0);

    // Normalized map of precalculated records by dd-MMM-yyyy
    const precalcMap = new Map<string, ProcessedRecord>();
    if (emp.precalculatedRecords && Array.isArray(emp.precalculatedRecords)) {
      emp.precalculatedRecords.forEach(r => {
        if (r && r.date) {
          const dobj = flexibleParseDate(r.date);
          const normKey = !isNaN(dobj.getTime()) ? formatCanonicalDate(dobj) : r.date;
          precalcMap.set(normKey, r);
          precalcMap.set(r.date, r);
        }
      });
    }

    const rawEmpAttendance = emp.attendance || emp.dates || {};
    const empAttendance = new Map<string, AttendanceCell>();
    for (const [k, v] of Object.entries(rawEmpAttendance)) {
      if (!v) continue;
      const dobj = flexibleParseDate(k);
      const normKey = !isNaN(dobj.getTime()) ? formatCanonicalDate(dobj) : k;
      empAttendance.set(normKey, v);
      empAttendance.set(k, v);
    }

    const records: ProcessedRecord[] = [];

    dateInfo.forEach(({ dateStr, formattedDate, holidayName, dayName: calendarDayName }) => {
      const precalc = precalcMap.get(formattedDate) || precalcMap.get(dateStr);
      const attendance = empAttendance.get(formattedDate) || empAttendance.get(dateStr);

      // Holiday status comes from Settings only (gazetted dates + Saturday/Sunday).
      const isDayHoliday = holidayName !== null;
      const dayName = calendarDayName ?? (precalc?.dayName || 'Day');

      const rawIn = attendance?.timeIn || precalc?.timeIn || '';
      const rawOut = attendance?.timeOut || precalc?.timeOut || '';

      const hasAttendanceTime = Boolean(rawIn && rawIn !== '-' && rawIn !== '—' && rawOut && rawOut !== '-' && rawOut !== '—');

      const timeInStr = rawIn && rawIn !== '-' && rawIn !== '—' ? rawIn : '';
      const timeOutStr = rawOut && rawOut !== '-' && rawOut !== '—' ? rawOut : '';

      const timeIn = hasAttendanceTime ? parseHHMM(timeInStr) : 0;
      const timeOut = hasAttendanceTime ? parseHHMM(timeOutStr) : 0;
      // Durations are always calculated here; nothing is taken from the source file.
      const totalWorkedHours = hasAttendanceTime ? Math.max(0, hoursBetween(timeIn, timeOut)) : 0;

      const officeStart = precalc?.officeStart ? parseHHMM(precalc.officeStart) : globalOfficeStart;
      const officeEnd = precalc?.officeEnd ? parseHHMM(precalc.officeEnd) : globalOfficeEnd;
      const officeHours = Math.max(0, officeEnd - officeStart) || globalOfficeDuration;
      const workedHours = hasAttendanceTime ? Math.max(0, hoursBetween(officeEnd, timeOut)) : 0;

      let otHours = 0;
      let amount = 0;
      let adjustment = 0;

      // Late arrival adjustment: skip on holidays — arrival time is irrelevant
      // on rest days, and holiday pay is flat (not time-based).
      if (policy.lateArrivalToggle && hasAttendanceTime && !isDayHoliday && timeIn > officeStart) {
        adjustment = lateAdjustmentHours(hoursBetween(officeStart, timeIn), roundingMode);
      }

      if (!isExempt) {
        if (isDayHoliday) {
          // ---- Holiday / rest day ----
          // Holiday amount is only paid when the employee actually punched in and out.
          if (!hasAttendanceTime) {
            otHours = 0;
            amount = 0;
          } else {
            // Holiday is paid on attendance only — no OT hours are attached,
            // and no OT amount is computed from hours.
            otHours = 0;

            if (isFixedRate) {
              amount = policy.support.holidayRate;
            } else if (holidayRate > 0) {
              amount = holidayRate;
            } else {
              amount = 0;
            }
          }
        } else {
          // Regular working day overtime: OT starts at shift end. Late arrival is
          // offset hour-for-hour, then the minimum threshold and rounding mode apply.
          const grossOT = hasAttendanceTime ? Math.max(0, hoursBetween(officeEnd, timeOut)) : 0;
          const netOT = netOvertimeHours(grossOT, adjustment, policy.lateArrivalToggle);
          const eligibleOT = computeOTHours(netOT, policy.minThreshold, roundingMode);

          if (eligibleOT > 0) {
            // Caps are selected by rate type, not category:
            //   Fixed rate  → 6 hrs / 480 PKR
            //   Dynamic rate → 3 hrs / 550 PKR (regardless of support vs official)
            const dailyCap = isFixedRate ? policy.support.dailyOTCap : policy.official.dailyOTCap;
            otHours = Math.min(eligibleOT, dailyCap);

            const maxDaily = isFixedRate ? policy.support.maxDailyAmount : policy.official.maxDailyAmount;

            if (isFixedRate) {
              amount = round(Math.min(otHours * policy.support.hourlyRate, maxDaily), roundingMode);
            } else if (hourlyRate > 0) {
              amount = round(Math.min(otHours * hourlyRate, maxDaily), roundingMode);
            } else {
              // Dynamic rate with no basic pay → no amount
              amount = 0;
            }
          }
        }
      }

      const rawRemark = (precalc?.remarks || '').trim();
      const fileRemark = /^holiday$/i.test(rawRemark) ? '' : rawRemark;

      records.push({
        date: formattedDate,
        dayName,
        timeIn: timeInStr,
        timeOut: timeOutStr,
        totalWorkedHours: isDayHoliday && !hasAttendanceTime ? 0 : round(totalWorkedHours, roundingMode),
        workedHours: isDayHoliday && !hasAttendanceTime ? 0 : round(workedHours || otHours, roundingMode),
        officeHours,
        officeTiming: precalc?.officeTiming || `${(policy.officeTiming?.start || '08:00').replace(':', '')}-${(policy.officeTiming?.end || '16:00').replace(':', '')}`,
        otHours,
        adjustment,
        amount: round(amount, roundingMode),
        // A remark that only says "Holiday" is stale file text; the real reason comes from Settings.
        remarks: fileRemark || holidayName || '',
        isHoliday: isDayHoliday
      });
    });

    let finalRecords = records;

    // Monthly day cap rules:
    //   • Applies to every employee (fixed or dynamic), EXCEPT Drivers.
    //   • Holidays never count toward the cap and are always paid.
    //   • Selection is by OT hours descending — the highest-OT days win.
    const capExempt = resolveCapExempt(emp.designation, rateType, policy);
    if (!isExempt && !capExempt) {
      const workingDaysWithOT = records.filter(r => !r.isHoliday && r.otHours > 0);
      if (workingDaysWithOT.length > policy.official.monthlyDayCap) {
        const topWorkingDays = [...workingDaysWithOT]
          .sort((a, b) => b.otHours - a.otHours)
          .slice(0, policy.official.monthlyDayCap);

        const topDayDates = new Set(topWorkingDays.map(r => r.date));

        finalRecords = records.map(r => {
          if (!r.isHoliday && r.otHours > 0 && !topDayDates.has(r.date)) {
            return {
              ...r,
              amount: 0,
              exceededMonthlyCap: true,
              remarks: r.remarks ? `${r.remarks} (Exceeded monthly cap)` : 'Exceeded monthly cap'
            };
          }
          return r;
        });
      }
    }

    // Days dropped by the monthly cap are not paid, so their hours are not counted either.
    const totalOTHours = round(
      finalRecords.reduce((sum, r) => sum + (r.exceededMonthlyCap ? 0 : r.otHours), 0),
      roundingMode,
    );
    const totalAmount = round(finalRecords.reduce((sum, r) => sum + r.amount, 0), roundingMode);

    return {
      erp: emp.erp,
      name: toTitleCase(emp.name),
      designation: emp.designation,
      category,
      basicPay,
      records: finalRecords,
      totalOTHours,
      totalAmount,
      isSupport,
      rateType: (isFixedRate ? 'fixed' : 'dynamic') as 'fixed' | 'dynamic',
      hourlyRate: effectiveHourlyRate,
      dayRate: effectiveDayRate
    };
  });

  const withData = allProcessed.filter(emp => emp.totalOTHours > 0 || emp.totalAmount > 0 || emp.records.length > 0);
  return withData.length > 0 ? withData : allProcessed;
}