// report.js

import { numToHHMM } from './utils.js'
// const { jsPDF } = window.jspdf;

// ─────────────────────────────────────────────────────────────────────────────
// For webpack builds, uncomment below code
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

jsPDF.API.autoTable = autoTable;

// ─────────────────────────────────────────────────────────────────────────────
// Generate PDF Report
// ─────────────────────────────────────────────────────────────────────────────

const paragraph = `Late sitting is submitted for above mentioned employee for the duty performed by him/her\nin addition to normal duty hours for the month of`;
const HEADER = 'National Database and Registration Authority\nMinistry of Interior\nRegional Head Office Islamabad';
const LEFT_MARGIN = 20;
const RIGHT_MARGIN = 20;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 20;

// 1) Define your base labelProps once:
const labelProps = [
    { label: 'ERP:', prop: 'erp' },
    { label: 'Name:', prop: 'name' },
    { label: 'Designation:', prop: 'designation' },
    { label: 'Basic Pay:', prop: 'basicPay' },
    { label: 'Rate/Day:', prop: 'ratePerHoliday' },
    { label: 'Rate/Hour:', prop: 'ratePerHour' },
    { label: 'Max Rate/Day:', prop: 'maxRatePerWorkingDay' }
];

const noBasicLabelOverrides = {
    ratePerHour: 'Rate Per Hour:',
    ratePerHoliday: 'Rate Per Holiday:',
    maxRatePerWorkingDay: 'Max Rate Per Day:'
};

function buildLabelValueItems(docInstance, employee, fontSize) {
    docInstance.setFontSize(fontSize);
    const hasBasic = employee.basicPay !== false;
    return labelProps
        .filter(lp => !(lp.prop === 'basicPay' && !hasBasic))
        .map(({ label, prop }) => {
            const labelText = (!hasBasic && noBasicLabelOverrides[prop])
                ? noBasicLabelOverrides[prop]
                : label;

            const value = employee[prop] != null
                ? employee[prop].toString()
                : '';

            docInstance.setFont('helvetica', 'bold');
            const labelWidth = docInstance.getTextWidth(labelText) || 0;

            docInstance.setFont('helvetica', 'normal');
            const valueWidth = docInstance.getTextWidth(value) || 0;

            const spaceWidth = docInstance.getTextWidth('  ') || 0;

            return {
                prop,
                labelText,
                value,
                labelWidth,
                valueWidth,
                actualWidth: labelWidth + spaceWidth + valueWidth
            };
        });
}

function buildRows(itemList) {
    return [
        itemList.slice(0, 3),  // First row: 3 items
        itemList.slice(3, 7)   // Second row: up to 4 items
    ];
}

function drawRows(docInstance, rows, yPos) {
    const startingXPos = 20;
    rows.forEach((row, idx) => {
        const widths = row.map(item => item.actualWidth);
        const sumWidth = widths.reduce((a, b) => a + b, 0);

        const pageWidth = docInstance.internal.pageSize.width;
        const usableWidth = pageWidth - 40;

        const minGap = 10;
        const fallbackMinGap = 5;

        const idealGap = row.length > 1
            ? (usableWidth - sumWidth) / (row.length - 1)
            : minGap;

        const gap = Math.max(fallbackMinGap, Math.min(minGap, idealGap));

        let xPos = startingXPos;
        row.forEach(item => {
            docInstance.setFont('helvetica', 'bold');
            docInstance.text(item.labelText || '', xPos, yPos);

            docInstance.setFont('helvetica', 'normal');
            const spaceWidth = docInstance.getTextWidth('  ') || 0;
            const offset = item.labelWidth + spaceWidth;
            docInstance.text(item.value || '', xPos + offset, yPos);

            xPos += item.actualWidth + gap;
        });

        if (idx < rows.length - 1) yPos += 10;
    });

    return yPos;
}

function renderContent(docInstance, employee, options) {
    const {
        fontSize = defaultOptions.fontSize,
        yMargin = defaultOptions.yMargin,
        showHeader = defaultOptions.showHeader,
        showPara = defaultOptions.showPara,
        sectionSpacing = defaultOptions.sectionSpacing,
        adjustTable = defaultOptions.adjustTable,
        spacing = defaultOptions.spacing
    } = options || {};

    const pageWidth = docInstance.internal.pageSize.width;
    const usableWidth = pageWidth - 40;
    let yPos = yMargin;

    docInstance.setFontSize(fontSize);

    // Header
    if (showHeader) {
        docInstance.setFont('helvetica', 'bold');
        const headerLines = docInstance.splitTextToSize(HEADER, usableWidth);
        docInstance.text(headerLines, 20 + usableWidth / 2, yPos, { align: 'center' });
        const textHeight = docInstance.getTextDimensions(headerLines).h;
        yPos += textHeight;
    }

    // Horizontal Line
    docInstance.setLineWidth(0.2);
    docInstance.line(20, yPos, pageWidth - 20, yPos);
    yPos += sectionSpacing;

    // Employee Info
    const itemList = buildLabelValueItems(docInstance, employee, fontSize);
    let rows = buildRows(itemList);
    yPos = drawRows(docInstance, rows, yPos);
    yPos += sectionSpacing;

    // Paragraph
    if (showPara) {
        const monthYear = employee.monthYear || "N/A";
        const baseLineHeight = docInstance.getTextDimensions('A').h;
        const lineSpacing = baseLineHeight * 1.5;
        const paraLines = docInstance.splitTextToSize(paragraph, usableWidth);

        for (let i = 0; i < paraLines.length; i++) {
            const line = paraLines[i];

            if (i === paraLines.length - 1) {
                const lineWidth = docInstance.getTextWidth(line);
                docInstance.text(line, 20, yPos);

                docInstance.setFont(undefined, 'bold');
                docInstance.text(`  ${monthYear}`, 20 + lineWidth, yPos);
                docInstance.setFont(undefined, 'normal');
            } else {
                docInstance.text(line, 20, yPos);
            }

            yPos += lineSpacing;
        }
    }

    // Table
    const tableData = employee.dateRecords || [];
    const body = tableData.map((r, i) => [
        i + 1,
        r.date,
        `${numToHHMM(r.timeIn)}`,
        `${numToHHMM(r.timeOut)}`,
        r.hoursWorked,
        r.dayPay,
        r.isHoliday ? 'Holiday' : ''
    ]);

    body.push([{
        content: 'Total Overtime',
        colSpan: 5,
        styles: { halign: 'center', fontStyle: 'bold' }
    }, {
        content: employee.totalOvertimePay.toString(),
        styles: { fontStyle: 'bold' }
    }, {
        content: ''
    }]);

    autoTable(docInstance, {
        head: [['Sr.', 'Date', 'Time In', 'Time Out', 'Hours', 'Amount', 'Remarks']],
        body,
        startY: yPos,
        tableWidth: 'auto',
        margin: { left: 20, right: 20 },
        styles: {
            fontSize: fontSize,
            cellPadding: adjustTable ? 1 : 2,
            halign: 'center',
            valign: 'top',
            lineWidth: 0.2,
            lineColor: [0, 0, 0],
        },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 'auto' },
            6: { cellWidth: 'auto' }
        },
        didParseCell: data => {
            if (data.row.section === 'head' || data.row.index === body.length - 1) {
                data.cell.styles.fontStyle = 'bold';
            }
            if (data.row.section === 'body' && tableData[data.row.index] && tableData[data.row.index].isHoliday) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });
    yPos = docInstance.lastAutoTable.finalY + spacing.afterTable;

    // Signatures
    docInstance.setFont('helvetica', 'normal');
    const bar = '_'.repeat(15);
    docInstance.text(`Employee: ${bar}`, pageWidth - 20, yPos, { align: 'right' });
    if (employee.designation === 'Driver') {
        docInstance.text(`MT Supervisor: ${bar}`, 20, yPos);
        yPos += spacing.signature;
        docInstance.text(`AD (MT/Admin): ${bar}`, 20 + usableWidth / 2, yPos, { align: 'center' });
    } else {
        yPos += spacing.signature;
        docInstance.text(`Ad Admin: ${bar}`, 20, yPos);
    }

    const afterPages = docInstance.getNumberOfPages();
    const pagesUsed = docInstance.lastAutoTable?.pageCount || 1;

    return { yPos: yPos, totalPages: afterPages, pagesUsed };
}

export function generatePDF(records) {
    const doc = new jsPDF();
    if (!doc) {
        console.error('generatePDF: Failed to create jsPDF instance');
        return;
    }

    Object.values(records || {}).forEach((employee, idx) => {
        let bestOptions = null;

        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];
            const options = { ...defaultOptions, ...scenario };

            const tempDoc = new jsPDF();
            const { yPos, pagesUsed } = renderContent(tempDoc, employee, options);

            const bottomLimit = tempDoc.internal.pageSize.height - options.yMargin;

            if (pagesUsed === 1 && yPos <= bottomLimit) {
                console.log(`${employee.name} fits on scenario ${i + 1}`);
                bestOptions = options;
                break;
            }
        }

        if (!bestOptions) {
            bestOptions = {
                ...defaultOptions,
                ...scenarios[scenarios.length - 1]
            };
            console.warn(`⚠️ ${employee.name} didn't fit any scenario — using last one`);
        }

        if (idx > 0) doc.addPage();
        renderContent(doc, employee, bestOptions);
    });

    doc.output('dataurlnewwindow');
}

const defaultOptions = {
    fontSize: 12,
    yMargin: 20,
    lineHeight: 1.12,
    adjustTable: false,
    showHeader: true,
    showPara: true,
    sectionSpacing: 15,
    spacing: {
        betweenRows: 0,
        afterRows: 0,
        afterPara: 0,
        afterTable: 18,
        betweenSig: 0,
        signature: 20
    }
};

const scenarios = [
    { fontSize: 12, yMargin: 20, sectionSpacing: 15 },
    { fontSize: 12, yMargin: 10, sectionSpacing: 15 },
    { fontSize: 11, yMargin: 10, sectionSpacing: 12 },
    { fontSize: 11, yMargin: 10, sectionSpacing: 10, adjustTable: true }
];