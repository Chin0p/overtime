// report.js

import { buildLabelValueItems } from './utils/employeeUtils.js';
import { drawRows } from './utils/pdfUtils.js';
import { buildTableData } from './utils/tableUtils.js';
import { HEADER, LEFT_MARGIN, RIGHT_MARGIN } from './utils/constants.js';
import { defaultOptions, scenarios } from './utils/config.js';

// ...main generatePDF logic...
export { generatePDF } from './pdfGenerator.js';
// If you want to expose helpers elsewhere:
export * from './reportHelpers.js';