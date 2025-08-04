// dom.js

import { numToHHMM } from './utils.js';


export function populateDropdown(e) {
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

export function updateEmployeeInfoCard(e) {
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

export function updateOvertimeTable(employee) {
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