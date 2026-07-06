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
  const pageHeight = doc.internal.pageSize.getHeight();
  const baseMargin = pdf.margin || 15;

  function drawHeader(y: number, margin: number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(pdf.headerFontSize + 2);
    doc.text('Ministry of Interior', pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(pdf.headerFontSize);
    doc.text('NADRA Regional Head Office Islamabad', pageWidth / 2, y + 7, { align: 'center' });
    
    doc.setLineWidth(0.3);
    doc.line(margin, y + 15, pageWidth - margin, y + 15);
    
    doc.setFont('helvetica', 'normal');
    return y + 30;
  }

  // --- Summary Page ---
  let currentY = drawHeader(20, baseMargin);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Overtime Summary for the month of ${monthLabel}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  const eligibleEmployees = employees.filter(emp => emp.totalAmount > 0);
  const summaryRows = eligibleEmployees.map((emp, idx) => [
    idx + 1,
    emp.erp,
    emp.name,
    emp.designation,
    emp.totalOTHours,
    formatAmount(emp.totalAmount)
  ]);

  const totalSummaryAmount = eligibleEmployees.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalSummaryHours = eligibleEmployees.reduce((sum, e) => sum + e.totalOTHours, 0);

  autoTable(doc, {
    startY: currentY,
    head: [['Sr.', 'ERP', 'Name', 'Designation', 'Total Hrs', 'Amount']],
    body: summaryRows,
    foot: [['', '', '', 'Total', totalSummaryHours.toString(), formatAmount(totalSummaryAmount)]],
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'left' },
      3: { halign: 'left' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'foot' && data.column.index === 4) {
        data.cell.styles.halign = 'center';
      }
      if (data.section === 'foot' && data.column.index === 5) {
        data.cell.styles.halign = 'center';
      }
    },
    styles: { fontSize: pdf.tableFontSize, cellPadding: pdf.cellPadding },
    margin: { left: baseMargin, right: baseMargin },
    pageBreak: 'auto'
  });
  
  // --- Individual Pages ---
  eligibleEmployees.forEach((emp) => {
    doc.addPage();
    
    const recordRows = emp.records
      .filter(r => r.otHours >= 1 || r.isHoliday)
      .map((r, idx) => [
        idx + 1,
        r.date,
        r.dayName,
        r.timeIn,
        r.timeOut,
        r.otHours ? r.otHours.toString().padStart(2, '0') : '-',
        formatAmount(r.amount),
        r.remarks
      ]);

    // Dynamic Margin: Use minimal margins if entries > 17
    const currentMargin = recordRows.length > 17 ? 10 : baseMargin;
    
    currentY = drawHeader(20, currentMargin);
    doc.setFontSize(pdf.labelFontSize);
    doc.setFont('helvetica', 'bold');
    
    // Label:Value pairs
    const startX = currentMargin;
    const col2X = pageWidth / 2;
    
    doc.text('Name:', startX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.name, startX + 20, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.text('ERP:', col2X, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.erp, col2X + 20, currentY);
    
    currentY += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Designation:', startX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(emp.designation, startX + 30, currentY);
    
    if (!emp.isSupport) {
      doc.setFont('helvetica', 'bold');
      doc.text('Basic Pay:', col2X, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatAmount(emp.basicPay), col2X + 30, currentY);
      
      currentY += 6;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Month:', startX, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(monthLabel, startX + 20, currentY);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text('Month:', col2X, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(monthLabel, col2X + 20, currentY);
    }
    
    currentY += 10;

    // --- Smart Scaling Logic ---
    // Calculate if we need to squeeze the table to fit signatures on the same page
    const headerHeight = 50; // drawHeader(20) ends at ~50mm
    const labelsHeight = 25; // Employee details take ~25mm
    const signatureSpace = 45; // Space needed for signatures and padding
    const reservedHeight = headerHeight + labelsHeight + signatureSpace;
    const availableHeight = pageHeight - reservedHeight;
    
    // Estimate height of one row (font size in mm + padding top/bottom)
    const rowHeightEstimate = (pdf.tableFontSize * 0.3527) + (pdf.cellPadding * 2);
    const estimatedTableHeight = (recordRows.length + 2) * rowHeightEstimate; // +2 for head/foot
    
    let appliedFontSize = pdf.tableFontSize;
    let appliedPadding = pdf.cellPadding;
    let appliedSignatureGap = 20;

    // If table is too long, calculate a squeeze factor
    if (estimatedTableHeight > availableHeight) {
      const squeezeFactor = Math.max(0.7, availableHeight / estimatedTableHeight);
      appliedFontSize = Math.max(6, pdf.tableFontSize * squeezeFactor);
      appliedPadding = Math.max(0.5, pdf.cellPadding * squeezeFactor);
      appliedSignatureGap = Math.max(10, 20 * squeezeFactor);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Sr.', 'Date', 'Day', 'In', 'Out', 'OT Hrs', 'Amount', 'Remarks']],
      body: recordRows,
      foot: [['', '', '', '', '', 'Total', formatAmount(emp.totalAmount), '']],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'left' }, // Remarks left aligned
      },
      didParseCell: (data) => {
        if (data.section === 'foot' && data.column.index === 6) {
          data.cell.styles.halign = 'center';
        }
      },
      styles: { 
        fontSize: appliedFontSize, 
        cellPadding: appliedPadding 
      },
      margin: { left: currentMargin, right: currentMargin, bottom: 10 },
      pageBreak: 'avoid'
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Position signatures based on calculated gap, but ensure they don't exceed page
    let signatureY = Math.min(finalY + appliedSignatureGap, pageHeight - 30);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const line = '_'.repeat(20);
    
    // Employee Signature (Top Right) - Aligned to right margin
    doc.text(`Employee Signature: ${line}`, pageWidth - currentMargin, signatureY, { align: 'right' });
    
    // Vertical spacing
    const officerY = signatureY + 15;
    
    // AD Admin (Bottom Left) - Aligned to left margin
    doc.text(`AD Admin: ${line}`, currentMargin, officerY);
  });

  return doc;
}
