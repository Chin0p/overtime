// main.js
import './styles.css'
import { generatePDF } from './report.js';
import {
    isHoliday,
    hhmmToNum,
    numToHHMM,
    toMinutes,
    roundToHours,
    toSentenseCase,
    getMonthYear,
    parseDate,
    buttonShake,
    BASIC_PAY
} from './utils.js'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const WORK_START_TIME = 830;
const WORK_END_TIME = 1630;
const MAX_HOLIDAY_HOURS = 8;
const MAX_WORKING_DAYS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// DATA MODELS & CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

function buildEmployee(erp, name, d) {
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

function buildDateRecords(cells, dates, e) {
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

function calculateHours(e, r) {
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

function calculatePay(e, r) {
    const hourlyPay = e.ratePerHour * r.hoursWorked;
    const pay = r.isHoliday ? e.ratePerHoliday : Math.min(hourlyPay, e.maxRatePerWorkingDay);
    return Math.round(pay);
}

let records = {};

function processCSV(data) {
    records = {};
    const rows = data.trim().replace(/\n|"/g, '').split('\r');

    if (!rows[0]) {
        throw new Error('CSV data is empty or malformed.');
    }

    const headers = rows[0].split(',');
    const dates = headers.slice(3).map(d => `${d}-2025`);
    const monthYear = getMonthYear(dates);

    rows.slice(1).forEach(row => {
        const [erp, name, desig, ...cells] = row.split(',');

        const employee = buildEmployee(erp, name, desig);
        if (!employee) return;
        employee.monthYear = monthYear;
        const dateRecords = buildDateRecords(cells, dates, employee);
        employee.dateRecords = dateRecords;
        employee.totalHoursWorked = dateRecords
            .reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
        employee.totalOvertimePay = dateRecords
            .reduce((sum, r) => sum + r.dayPay, 0);

        if (dateRecords.length) records[erp] = employee;
    });

    return records;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM UPDATES
// ─────────────────────────────────────────────────────────────────────────────

function populateDropdown(e) {
    const select = document.getElementById('employeeSelect');
    select.innerHTML = '';

    Object.values(e).forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.erp;
        opt.textContent = emp.name;
        select.appendChild(opt);
    });

    select.value = select.options[0].value;
    return true;
}

function updateEmployeeInfoCard(e) {
    const info = document.querySelector('.employee-info');
    const fields = [
        e.name,
        e.erp,
        e.designation,
        e.basicPay,
        e.ratePerHoliday,
        e.ratePerHour,
        e.maxRatePerWorkingDay,
    ];

    info.querySelectorAll('li span').forEach((span, i) => {
        if (i === 3 && e.basicPay === false) {
            span.textContent = "null";
            span.classList.add('pay-empty');
        } else {
            span.textContent = fields[i];
            span.classList.remove('pay-empty');
        }
    });
}

function updateOvertimeTable(employee) {
    const tbody = document.getElementById('overtimeData');
    const totalHours = document.getElementById('totalHours');
    const totalPay = document.getElementById('totalPay');

    if (!tbody || !totalHours || !totalPay) {
        console.error('Table elements not found: #overtimeData or #totalHours or #totalPay');
        return;
    }

    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    employee.dateRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        if (record.isHoliday) row.classList.add('holiday-row');

        const cells = [
            index + 1,
            record.date,
            numToHHMM(record.timeIn),
            numToHHMM(record.timeOut),
            record.hoursWorked,
            record.dayPay,
            record.isHoliday ? 'Holiday' : ''
        ];

        cells.forEach(cellData => {
            const td = document.createElement('td');
            td.textContent = cellData;
            row.appendChild(td);
        });

        fragment.appendChild(row);
    });

    tbody.appendChild(fragment);
    totalHours.textContent = employee.totalHoursWorked || '0';
    totalPay.textContent = employee.totalOvertimePay || '0';
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT SETUP
// ─────────────────────────────────────────────────────────────────────────────



const setupEventListeners = () => {
    const fileInput = document.getElementById('file-upload');
    const processBtn = document.getElementById('processBtn');
    const select = document.getElementById('employeeSelect');
    const fileLabel = document.querySelector('.file-label');
    const genReport = document.getElementById('genReport');

    if (!fileInput || !processBtn || !select || !fileLabel || !genReport) {
        console.error('One or more page elements not found');
        return;
    }

    fileInput.addEventListener('change', (e) => {
        processBtn.disabled = false;
        genReport.disabled = false;
        processBtn.innerHTML = '<span>Process</span>';
        const fileName = e.target.files[0]?.name || 'Choose CSV File';
        fileLabel.innerHTML = `📄 ${fileName}`;
    });

    processBtn.addEventListener('click', () => {
        if (!fileInput.files.length || !fileInput.files[0].name.endsWith('.csv')) {
            buttonShake(processBtn);
            return;
        }

        processBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            records = processCSV(e.target.result);
            if (!Object.keys(records).length) {
                window.alert('Invalid data!');
                processBtn.disabled = false;
            } else {
                const dropdownPopulated = populateDropdown(records);
                if (dropdownPopulated && select.options.length > 0) {
                    select.dispatchEvent(new Event('change'));
                    processBtn.innerHTML = '<span>File Processed</span>';
                } else {
                    window.alert('No records found in the file!');
                }
            }
        };
        reader.readAsText(fileInput.files[0]);
    });

    select.addEventListener('change', () => {
        const selectedEmployee = select.value;
        if (selectedEmployee && records) {
            updateEmployeeInfoCard(records[selectedEmployee]);
            updateOvertimeTable(records[selectedEmployee]);
        } else {
            updateEmployeeInfoCard(null);
            updateOvertimeTable(null);
        }
    });

    genReport.addEventListener('click', () => {
        if (!fileInput.files.length || !fileInput.files[0].name.endsWith('.csv') || !Object.keys(records).length > 0) {
            buttonShake(genReport);
            return;
        }
        genReport.disabled = true;
        genReport.classList.add('spinning-state');
        genReport.innerHTML = '<span class="spinning"></span>';

        setTimeout(() => {
            try {
                generatePDF(records);
                genReport.innerHTML = '<span>Report Generated</span>';
                genReport.disabled = true;
            } catch (error) {
                console.error('PDF generation failed:', error);
                buttonShake(genReport);
                genReport.innerHTML = '<span>Generate Report</span>';
                genReport.disabled = false;
                genReport.classList.remove('spinning-state');
            }
        }, 100);
    });
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});