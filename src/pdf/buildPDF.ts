import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProcessedEmployee, OTSettings } from '../types';
import { formatAmount } from '../lib/utils';

export function buildPDF(
  employees: ProcessedEmployee[],
  settings: OTSettings,
  monthLabel: string
): jsPDF {
  const { pdf } = settings;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pdf.pageSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const baseMargin = pdf.margin || 15;

  const headerTitle = pdf.headerTitle || 'Header Title Placeholder';
  const branchName = pdf.branchName || 'Branch Name Placeholder';
  const summarySubject = pdf.summarySubject || 'OVERTIME SUMMARY FOR THE MONTH OF';
  const sigLeftText = pdf.signatureLeft || 'Prepared By Placeholder';
  const sigRightText = pdf.signatureRight || 'Approved By Placeholder';

  function drawHeader(y: number, margin: number, title: string | null) {
    doc.setFont('helvetica', 'normal');
    
    // Top headers
    doc.setFontSize(pdf.headerFontSize + 2);
    doc.text(headerTitle, pageWidth / 2, y, { align: 'center' });
    
    doc.setFontSize(pdf.headerFontSize);
    doc.text(branchName, pageWidth / 2, y + 7, { align: 'center' });
    
    doc.setLineWidth(0.3);
    doc.line(margin, y + 15, pageWidth - margin, y + 15);
    
    if (title) {
      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(pdf.headerFontSize + 1);
      doc.text(title, pageWidth / 2, y + 25, { align: 'center' });
      return y + 33; // Return the Y position after header
    }

    return y + 22; // Return the Y position after header if no title
  }

  // 1. Executive Summary Page
  const summaryTitle = `${summarySubject} ${monthLabel.toUpperCase()}`;
  const startY = drawHeader(baseMargin + 5, baseMargin, summaryTitle);

  // Sort for summary page
  let summaryEmployees = [...employees];
  if (pdf.sortByDesignation) {
    summaryEmployees.sort((a, b) => a.designation.localeCompare(b.designation));
  } else {
    summaryEmployees.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  const summaryBody: any[] = summaryEmployees.map((emp, i) => [
    (i + 1).toString(),
    emp.erp,
    emp.name,
    formatAmount(emp.totalAmount)
  ]);

  const grandTotal = summaryEmployees.reduce((sum, emp) => sum + emp.totalAmount, 0);

  summaryBody.push([
    { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
    formatAmount(grandTotal)
  ]);

  autoTable(doc, {
    startY,
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
      // Bold the last row is handled via styles in colSpan object and Amount column columnStyles
      if (data.row.index === summaryBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // 2. Individual Employee Detail Pages
  employees.forEach((emp) => {
    const validRecords = emp.records.filter(r => r.otHours > 0 || r.isHoliday);
    // Only generate detail pages for employees with actual valid records
    if (validRecords.length === 0) return;

    doc.addPage();
    let yPos = drawHeader(baseMargin + 5, baseMargin, null);

    // Employee Meta Info
    doc.setFontSize(pdf.labelFontSize);
    const leftX = baseMargin;
    const rightX = pageWidth / 2 + 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Name:', leftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.name, leftX + 25, yPos);

    doc.setFont('helvetica', 'bold');
    doc.text('ERP:', rightX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.erp, rightX + 25, yPos);
    
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Designation:', leftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.designation, leftX + 25, yPos);

    doc.setFont('helvetica', 'bold');
    doc.text('Basic Pay:', rightX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.basicPay > 0 ? formatAmount(emp.basicPay) : 'N/A', rightX + 25, yPos);

    yPos += 12;

    const detailBody: any[] = validRecords.map((rec, i) => [
      (i + 1).toString(),
      rec.date,
      rec.dayName,
      rec.timeIn,
      rec.timeOut,
      rec.otHours.toString(),
      formatAmount(rec.amount),
      rec.remarks || ''
    ]);

    detailBody.push([
      { content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      emp.totalOTHours.toString(),
      formatAmount(emp.totalAmount),
      ''
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Sr', 'Date', 'Day', 'In', 'Out', 'OT Hrs', 'Amount', 'Remarks']],
      body: detailBody,
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
        0: { cellWidth: 10, halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'right' }
      },
      styles: {
        cellPadding: pdf.cellPadding,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      didParseCell: (data) => {
        // Highlight & bold holidays
        const rowIndex = data.row.index;
        if (rowIndex < validRecords.length) {
          const record = validRecords[rowIndex];
          if (record.isHoliday) {
            data.cell.styles.fillColor = [255, 240, 240];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        
        // Bold the total row
        if (rowIndex === detailBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Signature Area
    const pageHeight = doc.internal.pageSize.getHeight();
    const finalY = (doc as any).lastAutoTable.finalY;
    
    let sigY = finalY + 30;
    if (sigY + 10 > pageHeight - baseMargin) {
      doc.addPage();
      sigY = baseMargin + 30;
    }
    
    doc.setLineWidth(0.3);
    
    // Left signature
    doc.line(baseMargin, sigY, baseMargin + 40, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(sigLeftText, baseMargin + 20, sigY + 5, { align: 'center' });
    
    // Right signature
    doc.line(pageWidth - baseMargin - 40, sigY, pageWidth - baseMargin, sigY);
    doc.text(sigRightText, pageWidth - baseMargin - 20, sigY + 5, { align: 'center' });
  });

  return doc;
}
