export const defaultOptions = {
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

export const scenarios = [
    { fontSize: 12, yMargin: 20, sectionSpacing: 15 },
    { fontSize: 12, yMargin: 10, sectionSpacing: 15 },
    { fontSize: 11, yMargin: 10, sectionSpacing: 12 },
    { fontSize: 11, yMargin: 10, sectionSpacing: 10, adjustTable: true }
];