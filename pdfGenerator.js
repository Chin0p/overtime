// pdfGenerator.js

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
