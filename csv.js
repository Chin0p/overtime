// csv.js

import { buildEmployee, buildDateRecords } from './employee.js';
import { getMonthYear } from './utils.js';


export function processCSV(data) {
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
