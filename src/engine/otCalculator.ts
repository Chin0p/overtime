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
import { getHolidayName } from './holidayChecker';
import { parseHHMM, flexibleParseDate, toTitleCase, formatCanonicalDate } from '../lib/utils';
import { round } from '../lib/math';
import { SUPPORT_DESIGNATION_KEYWORDS, inferIsSupport, resolveRateType, resolveCapExempt } from '../parser/parserUtils';
import { format } from 'date-fns';

export function processEmployees(
  data: AttendanceData,
  settings: OTSettings,
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

  const eligibleEmployees = employees.filter(emp => {
    const desLower = (emp.designation || '').toLowerCase();
    const isSupportByKeyword = SUPPORT_DESIGNATION_KEYWORDS.some(kw => desLower.includes(kw));
    const category = emp.category || (emp.isSupport !== undefined 
      ? (emp.isSupport ? 'support' : 'official') 
      : policy.designationCategories?.[emp.designation] || (isSupportByKeyword ? 'support' : undefined));
    if (category === 'exempt') return false;
    if (!category && !emp.precalculatedRecords && !emp.totalOTHours && desLower.includes('officer')) return false;
    return true;
  });

  const allProcessed = eligibleEmployees.map(emp => {
    const declaredCategory = emp.category || policy.designationCategories?.[emp.designation];
    const isExempt = declaredCategory === 'exempt';
    const isSupport = !isExempt && (
      declaredCategory === 'support'
      || (declaredCategory === undefined && (emp.isSupport ?? inferIsSupport(undefined, undefined, emp.designation)))
    );
    const category: EmployeeCategory = isExempt ? 'exempt' : (isSupport ? 'support' : 'official');

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

    // Dates come from L1 (already sorted + canonical).
    const targetDates = canonicalDates;

    const records: ProcessedRecord[] = [];

    targetDates.forEach(dateStr => {
      const dateObj = flexibleParseDate(dateStr);
      const formattedDate = !isNaN(dateObj.getTime()) ? formatCanonicalDate(dateObj) : dateStr;

      const precalc = precalcMap.get(formattedDate) || precalcMap.get(dateStr);
      const attendance = empAttendance.get(formattedDate) || empAttendance.get(dateStr);

      const isRecordHoliday = Array.isArray(emp.holidayDates)
        ? emp.holidayDates.includes(formattedDate) || emp.holidayDates.includes(dateStr)
        : Boolean(precalc?.isHoliday);

      const holidayName = getHolidayName(formattedDate, gazettedHolidays) || 
                          getHolidayName(dateStr, gazettedHolidays) || 
                          (isRecordHoliday ? (precalc?.remarks || 'Holiday') : null);

      const isDayHoliday = holidayName !== null || Boolean(precalc?.isHoliday);
      const dayName = !isNaN(dateObj.getTime()) ? format(dateObj, 'EEEE') : (precalc?.dayName || 'Day');

      const rawIn = attendance?.timeIn || precalc?.timeIn || '';
      const rawOut = attendance?.timeOut || precalc?.timeOut || '';

      const hasAttendanceTime = Boolean(rawIn && rawIn !== '-' && rawIn !== '—' && rawOut && rawOut !== '-' && rawOut !== '—');

      const timeInStr = rawIn && rawIn !== '-' && rawIn !== '—' ? rawIn : '';
      const timeOutStr = rawOut && rawOut !== '-' && rawOut !== '—' ? rawOut : '';

      const timeIn = hasAttendanceTime ? parseHHMM(timeInStr) : 0;
      const timeOut = hasAttendanceTime ? parseHHMM(timeOutStr) : 0;
      const totalWorkedHours = precalc?.totalWorkedHours !== undefined && precalc.totalWorkedHours > 0
        ? precalc.totalWorkedHours
        : (hasAttendanceTime ? Math.max(0, timeOut - timeIn) : 0);

      const officeStart = precalc?.officeStart ? parseHHMM(precalc.officeStart) : globalOfficeStart;
      const officeEnd = precalc?.officeEnd ? parseHHMM(precalc.officeEnd) : globalOfficeEnd;
      const officeHours = Math.max(0, officeEnd - officeStart) || globalOfficeDuration;
      const workedHours = precalc?.workedHours !== undefined && precalc.workedHours > 0
        ? precalc.workedHours
        : (hasAttendanceTime ? Math.max(0, timeOut - officeEnd) : 0);

      let otHours = 0;
      let amount = 0;
      let adjustment = precalc?.adjustment || 0;
      const isExplicitOT = Boolean(precalc && precalc.otHours !== undefined && precalc.otHours > 0);

      // Late arrival adjustment: skip on holidays — arrival time is irrelevant
      // on rest days, and holiday pay is flat (not time-based).
      if (policy.lateArrivalToggle && hasAttendanceTime && !isDayHoliday && timeIn > officeStart) {
        adjustment = round(timeIn - officeStart, roundingMode);
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
          // Regular working day overtime
          let rawOT = 0;
          if (precalc && precalc.otHours !== undefined && precalc.otHours > 0) {
            rawOT = precalc.otHours;
          } else if (timeOut > officeEnd) {
            rawOT = round(Math.max(0, timeOut - officeEnd), roundingMode);
          }

          const effectiveOT = policy.lateArrivalToggle ? Math.max(0, round(rawOT - adjustment, roundingMode)) : rawOT;

          if (isExplicitOT) {
            otHours = effectiveOT;
          }

          if (effectiveOT >= policy.minThreshold) {
            // Caps are selected by rate type, not category:
            //   Fixed rate  → 6 hrs / 480 PKR
            //   Dynamic rate → 3 hrs / 550 PKR (regardless of support vs official)
            const dailyCap = isFixedRate ? policy.support.dailyOTCap : policy.official.dailyOTCap;
            otHours = Math.min(effectiveOT, dailyCap);

            const maxDaily = isFixedRate ? policy.support.maxDailyAmount : policy.official.maxDailyAmount;

            if (isFixedRate) {
              amount = round(Math.min(otHours * policy.support.hourlyRate, maxDaily), roundingMode);
            } else if (hourlyRate > 0) {
              amount = round(Math.min(otHours * hourlyRate, maxDaily), roundingMode);
            } else {
              // Dynamic rate with no basic pay → no amount, regardless of source data
              amount = 0;
            }
          }
        }
      }

      records.push({
        date: formattedDate,
        dayName,
        timeIn: timeInStr,
        timeOut: timeOutStr,
        totalWorkedHours: isDayHoliday && !hasAttendanceTime ? 0 : round(totalWorkedHours, roundingMode),
        workedHours: isDayHoliday && !hasAttendanceTime ? 0 : round(workedHours || otHours, roundingMode),
        officeHours,
        officeTiming: precalc?.officeTiming || `${(policy.officeTiming?.start || '08:00').replace(':', '')}-${(policy.officeTiming?.end || '16:00').replace(':', '')}`,
        otHours: isExplicitOT ? otHours : round(otHours, roundingMode),
        adjustment,
        amount: round(amount, roundingMode),
        remarks: precalc?.remarks || holidayName || '',
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

    let totalOTHours = round(finalRecords.reduce((sum, r) => sum + r.otHours, 0), roundingMode);
    let totalAmount = round(finalRecords.reduce((sum, r) => sum + r.amount, 0), roundingMode);

    if (totalOTHours === 0 && emp.totalOTHours !== undefined && emp.totalOTHours > 0) {
      totalOTHours = emp.totalOTHours;
    }

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