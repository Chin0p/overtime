// events.js

import { processCSV } from './csv.js';
import { populateDropdown, updateEmployeeInfoCard, updateOvertimeTable } from './dom.js';
import { buttonShake } from './utils.js';
import { generatePDF } from './report.js';


let records = {};

export const setupEventListeners = () => {
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

export function getRecords() {
    return records;
}