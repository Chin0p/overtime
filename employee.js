// employee.js

import { BASIC_PAY, toSentenseCase } from './utils.js';
import { WORK_START_TIME, WORK_END_TIME, MAX_HOLIDAY_HOURS, MAX_WORKING_DAYS } from './constants.js';
import { isHoliday, hhmmToNum, toMinutes, roundToHours, parseDate } from './utils.js';

export function buildEmployee(erp, name, d) {
    let bp = BASIC_PAY[erp];
    let isBasicPay;

    if (!bp || bp === 0) {
        isBasicPay = false;
        if (!['Naib Qasid', 'Driver'].includes(d)) {
            console.warn(`Basic pay not found for ${erp} -> ${name}`);
            return;
        } else {
            console.warn(`Basic pay not found for ${erp} -> ${name}`);
        }
    } else {
        isBasicPay = true;
    }

    const isNaibQasid = d === 'Naib Qasid';
    const isDriver = d === 'Driver';
    return {
        erp: Number(erp),
        name: toSentenseCase(name),
        designation: d,
        basicPay: isBasicPay === true ? bp : false,
        isNaibQasid,
        isDriver,
        ratePerHoliday: isNaibQasid || isDriver ? 600 : Math.round(bp / 30),
        ratePerHour: isNaibQasid || isDriver ? 80 : Math.round(bp / 176),
        maxRatePerWorkingDay: isNaibQasid || isDriver ? 480 : 550,
        dateRecords: [],
        totalOvertimePay: 0
    };
}

export function buildDateRecords(cells, dates, e) {
    if (!Array.isArray(cells) || !Array.isArray(dates) || cells.length !== dates.length) {
        console.error('Invalid input: cells and dates must be arrays of equal length');
        return { records: [], totalHoursWorked: 0 };
    }

    const dateRecords = [];

    cells.forEach((cell, i) => {
        const match = cell.match(/P\((\d{2}:\d{2})\)\((\d{2}:\d{2})\)/);
        if (!match) return;
        const [, timeIn, timeOut] = match;

        const r = {
            date: dates[i],
            timeIn: hhmmToNum(timeIn),
            timeOut: hhmmToNum(timeOut),
            isHoliday: isHoliday(dates[i]),
        };

        const hours = calculateHours(e, r);
        if (hours > 0) {
            r.hoursWorked = hours;
            r.dayPay = calculatePay(e, r);
            dateRecords.push(r);
        };
    });

    if (!dateRecords) return;

    const workdays = dateRecords.filter(r => !r.isHoliday);
    const holidays = dateRecords.filter(r => r.isHoliday);

    const cappedWorkdays = workdays.length > MAX_WORKING_DAYS
        ? [...workdays]
            .sort((a, b) => b.hoursWorked - a.hoursWorked)
            .slice(0, MAX_WORKING_DAYS)
        : workdays;

    return [...holidays, ...(e.isDriver ? workdays : cappedWorkdays)]
        .sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

export function calculateHours(e, r) {
    const inMin = toMinutes(r.timeIn);
    const outMin = toMinutes(r.timeOut);
    const workStartMin = toMinutes(WORK_START_TIME);
    const workEndMin = toMinutes(WORK_END_TIME);
    const requiredWorkMinutes = 8 * 60;
    const maxHours = (e.isDriver || e.isNaibQasid) ? 6 : 3;

    if (r.isHoliday) {
        const totalMins = outMin - inMin;
        return Math.min(roundToHours(totalMins), MAX_HOLIDAY_HOURS);
    }

    let beforeHours = 0;
    let afterHours = 0;

    if (e.isDriver && inMin < workStartMin) {
        const minsBefore = workStartMin - inMin;
        beforeHours = roundToHours(minsBefore);
    }

    let overtimeAfterMins = Math.max(0, outMin - workEndMin);
    afterHours = overtimeAfterMins / 60;

    if (afterHours < 1) {
        afterHours = 0;
    }

    const workedMins = outMin - inMin;
    if (workedMins < requiredWorkMinutes) {
        const lateMins = Math.max(0, inMin - workStartMin);
        const lateHours = lateMins / 60;
        afterHours = Math.max(0, afterHours - lateHours);
    }

    afterHours = roundToHours(afterHours * 60);
    const totalHours = e.isDriver ? beforeHours + afterHours : afterHours;
    return Math.min(totalHours, maxHours);
}

export function calculatePay(e, r) {
    const hourlyPay = e.ratePerHour * r.hoursWorked;
    const pay = r.isHoliday ? e.ratePerHoliday : Math.min(hourlyPay, e.maxRatePerWorkingDay);
    return Math.round(pay);
}