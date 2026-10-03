import jsPDFImport, { jsPDF as jsPDFType } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProcessedEmployee, OTSettings } from '../types';
import { formatAmount, toTitleCase } from '../lib/utils';

// Interop for jsPDF in browser Vite vs Node.js runtime
const jsPDFConstructor = (jsPDFImport as any).jsPDF || jsPDFImport;

export function buildPDF(
  employees: ProcessedEmployee[],
  settings: OTSettings,
  monthLabel: string
): jsPDFType {
  const { pdf } = settings;
  const pdfExcluded: string[] = pdf.pdfExcludedDesignations || [];
  const exportableEmployees = employees.filter(e =>
    e.totalAmount > 0 && !pdfExcluded.includes(e.designation)
  );
  const doc: jsPDFType = new jsPDFConstructor({
    orientation: 'portrait',
    unit: 'mm',
    format: pdf.pageSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const baseMargin = pdf.margin || 15;

  const leftSigLabel = toTitleCase(pdf.signatureLeft || 'Employee Signature');
  const rightSigLabel = toTitleCase(pdf.signatureRight || 'Officer Signature');

  // Equal vertical gap (in mm) above and below title/stats for symmetrical, breathable spacing
  const VERTICAL_GAP = 10;

  function drawHeader(y: number, margin: number, title: string | null): { tableStartY: number; lineY: number } {
    // 3-line Organization Header with each word capitalized
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Ministry Of Interior', pageWidth / 2, y, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('National Database And Registration Authority', pageWidth / 2, y + 5.5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Regional Head Office Islamabad', pageWidth / 2, y + 10.5, { align: 'center' });
    
    const lineY = y + 15;
    doc.setLineWidth(0.3);
    doc.line(margin, lineY, pageWidth - margin, lineY);
    
    if (title) {
      // Summary page: Equal gap before and after title
      // Before gap: lineY to titleY = VERTICAL_GAP (10mm)
      const titleY = lineY + VERTICAL_GAP;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(toTitleCase(title), pageWidth / 2, titleY, { align: 'center' });
      // After gap: titleY to summary table start = VERTICAL_GAP (10mm)
      return { tableStartY: titleY + VERTICAL_GAP, lineY };
    }

    // Detail pages: Returns lineY so caller can apply equal gap above and below stats
    return { tableStartY: lineY + VERTICAL_GAP, lineY };
  }

  // 1. Executive Summary Page
  // Capitalize each word in subject
  const summarySubject = toTitleCase(
    pdf.summarySubject 
      ? `${pdf.summarySubject} ${monthLabel}` 
      : `Overtime Of Admin Branch For The Month Of ${monthLabel}`
  );
  const { tableStartY: summaryTableStartY } = drawHeader(baseMargin + 4, baseMargin, summarySubject);

  // Sort for summary page
  let summaryEmployees = [...exportableEmployees];
  if (pdf.sortByDesignation) {
    summaryEmployees.sort((a, b) => a.designation.localeCompare(b.designation));
  } else {
    summaryEmployees.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  if (summaryEmployees.length === 0) {
    // No overtime this month — produce an empty PDF rather than a misleading one
    return doc;
  }

  const summaryBody: any[] = summaryEmployees.map((emp, i) => [
    (i + 1).toString(),
    emp.erp,
    toTitleCase(emp.name),
    formatAmount(emp.totalAmount)
  ]);

  const grandTotal = summaryEmployees.reduce((sum, emp) => sum + emp.totalAmount, 0);

  summaryBody.push([
    { content: 'Grand Total', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
    formatAmount(grandTotal)
  ]);

  autoTable(doc, {
    startY: summaryTableStartY,
    head: [['Sr', 'ERP', 'Name', 'Amount']],
    body: summaryBody,
    margin: { top: baseMargin, right: baseMargin, bottom: baseMargin, left: baseMargin },
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: pdf.tableFontSize,
    },
    bodyStyles: {
      fontSize: pdf.tableFontSize,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' } // Amount column
    },
    styles: {
      cellPadding: pdf.cellPadding,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    didParseCell: (data) => {
      // Bold the last row
      if (data.row.index === summaryBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Summary page does NOT have signatures (per organizational requirement)

  // 2. Individual Employee Detail Pages
  exportableEmployees.forEach((emp) => {
    // Skip rows zeroed out by the monthly day cap — they must not appear
    // in the exported detail table at all.
    const validRecords = emp.records.filter(r =>
      !r.exceededMonthlyCap &&
      (r.otHours >= 1 || (r.isHoliday && r.timeIn !== '' && r.timeOut !== ''))
    );
    // Only generate detail pages for employees with actual valid records
    if (validRecords.length === 0) return;

    doc.addPage();
    // Detail pages will NOT show the subject, only the header
    const { lineY } = drawHeader(baseMargin + 4, baseMargin, null);

    // Equal vertical gap above and below emp stats:
    // Distance from divider line (lineY) to Stats Row 1 = VERTICAL_GAP (10mm)
    const statsRow1Y = lineY + VERTICAL_GAP;
    // Row 2 is 6mm below Row 1
    const statsRow2Y = statsRow1Y + 6;
    // Distance from Stats Row 2 to detail table start = VERTICAL_GAP (10mm)
    const tableStartY = statsRow2Y + VERTICAL_GAP;

    // Rates: Resolve day and hour rates
    const isFixed = emp.rateType === 'fixed';
    const hourlyRate = emp.hourlyRate ?? (isFixed
      ? settings.policy.support.hourlyRate
      : (emp.basicPay > 0 ? Math.round(emp.basicPay / 176) : 0));

    const dayRate = emp.dayRate ?? (isFixed
      ? settings.policy.support.holidayRate
      : (emp.basicPay > 0 ? Math.round(emp.basicPay / 30) : 0));

    doc.setFontSize(pdf.labelFontSize || 9.5);
    const leftX = baseMargin;

    // Row 1: Name and ERP (fits on 1 row without wrapping)
    doc.setFont('helvetica', 'bold');
    doc.text('Name:', leftX, statsRow1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(toTitleCase(emp.name), leftX + 16, statsRow1Y);

    const erpX = pageWidth / 2 + 15;
    doc.setFont('helvetica', 'bold');
    doc.text('ERP:', erpX, statsRow1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.erp, erpX + 13, statsRow1Y);

    // Row 2: Designation, Rate/Day, Rate/Hour (fits on 2nd row without wrapping)
    doc.setFont('helvetica', 'bold');
    doc.text('Designation:', leftX, statsRow2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(toTitleCase(emp.designation), leftX + 25, statsRow2Y);

    const rateDayX = leftX + 78;
    doc.setFont('helvetica', 'bold');
    doc.text('Rate/Day:', rateDayX, statsRow2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(dayRate > 0 ? formatAmount(dayRate) : 'N/A', rateDayX + 20, statsRow2Y);

    const rateHourX = leftX + 130;
    doc.setFont('helvetica', 'bold');
    doc.text('Rate/Hour:', rateHourX, statsRow2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(hourlyRate > 0 ? formatAmount(hourlyRate) : 'N/A', rateHourX + 22, statsRow2Y);

    const detailBody: any[] = validRecords.map((rec, i) => [
      (i + 1).toString(),
      rec.date,
      rec.dayName,
      rec.timeIn,
      rec.timeOut,
      rec.isHoliday ? '—' : rec.otHours.toString(),
      formatAmount(rec.amount),
      rec.remarks || ''
    ]);

    detailBody.push([
      { content: 'Total', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      emp.totalOTHours.toString(),
      formatAmount(emp.totalAmount),
      ''
    ]);

    // Adapt font size & padding for large monthly records (e.g. 25-31 days) to prevent any page spill
    const recordCount = validRecords.length;
    const dynamicTableFontSize = recordCount > 24
      ? Math.min(pdf.tableFontSize, 7.5)
      : recordCount > 18
        ? Math.min(pdf.tableFontSize, 8)
        : pdf.tableFontSize;

    const dynamicCellPadding = recordCount > 24
      ? Math.min(pdf.cellPadding, 1.1)
      : recordCount > 18
        ? Math.min(pdf.cellPadding, 1.4)
        : pdf.cellPadding;

    autoTable(doc, {
      startY: tableStartY,
      head: [['Sr', 'Date', 'Day', 'In', 'Out', 'OT Hrs', 'Amount', 'Remarks']],
      body: detailBody,
      margin: { top: baseMargin, right: baseMargin, bottom: baseMargin + 12, left: baseMargin },
      pageBreak: 'avoid',
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
        fontSize: dynamicTableFontSize,
      },
      bodyStyles: {
        fontSize: dynamicTableFontSize,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'right' }
      },
      styles: {
        cellPadding: dynamicCellPadding,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      didParseCell: (data) => {
        const rowIndex = data.row.index;
        if (rowIndex < validRecords.length) {
          const record = validRecords[rowIndex];
          // Holiday rows: DO NOT highlight with fill color; only make row text bold!
          if (record.isHoliday) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
        
        // Bold the total row
        if (rowIndex === detailBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Signature Area: Never overflow to next page; use footer space if table is long
    const finalY = (doc as any).lastAutoTable.finalY;
    const footerSigY = pageHeight - baseMargin - 7;

    // Normal position has comfortable gap below table; clamped to footer area to never create page 2
    let sigY = Math.min(finalY + 16, footerSigY);
    if (sigY < finalY + 6) {
      sigY = finalY + 6;
    }
    
    doc.setLineWidth(0.3);
    
    // Left signature
    doc.line(baseMargin, sigY, baseMargin + 45, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(leftSigLabel, baseMargin + 22.5, sigY + 5, { align: 'center' });
    
    // Right signature
    doc.line(pageWidth - baseMargin - 45, sigY, pageWidth - baseMargin, sigY);
    doc.text(rightSigLabel, pageWidth - baseMargin - 22.5, sigY + 5, { align: 'center' });
  });

  return doc;
}