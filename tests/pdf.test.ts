import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPDF } from '../src/pdf/buildPDF';
import { processEmployees } from '../src/engine/otCalculator';
import { DEFAULT_SETTINGS } from '../src/constants';
import type { OTSettings } from '../src/types';
import { load, personRows, policy } from './fixtures';

const worked = { in: '08:00', out: '19:00' };
const rows = [
  ...personRows('90001', 'TEST OFFICIAL ONE', 'Superintendent', [{ d: 1, ...worked }, { d: 2, ...worked }]),
  ...personRows('90002', 'TEST DRIVER', 'Driver', [{ d: 1, ...worked }]),
  ...personRows('90003', 'TEST COOK', 'Cook', [{ d: 1, ...worked }]),
  ...personRows('90004', 'TEST EXEMPT', 'Mali', [{ d: 1, ...worked }]),
  ...personRows('90006', 'TEST NO OVERTIME', 'Superintendent', [{ d: 1, in: '08:00', out: '16:00' }]),
];

function makePdf(over: Partial<OTSettings['pdf']> = {}) {
  const p = policy({ roundingMode: 'floor', designationCategories: { Mali: 'exempt' } });
  const processed = processEmployees(load(rows), { policy: p }, { '90001': 52800, '90003': 35200, '90006': 52800 }, []);
  const settings: OTSettings = { ...DEFAULT_SETTINGS, policy: p, pdf: { ...DEFAULT_SETTINGS.pdf, ...over } };
  const doc = buildPDF(processed, settings, 'September 2026');
  // jsPDF writes page text uncompressed, so the output can be searched as plain text.
  return { doc, text: Buffer.from(doc.output('arraybuffer')).toString('latin1') };
}

test('summary page plus one page per employee who is paid', () => {
  const { doc, text } = makePdf();
  assert.equal(doc.getNumberOfPages(), 1 + 3, 'official, driver and cook are paid');
  assert.match(text, /Test Official One/);
  assert.match(text, /Test Driver/);
  assert.match(text, /Test Cook/);
});

test('left out: exempt people, people with nothing to pay, excluded designations', () => {
  const { doc, text } = makePdf({ pdfExcludedDesignations: ['Cook'] });
  assert.equal(doc.getNumberOfPages(), 1 + 2);
  assert.doesNotMatch(text, /Test Exempt/);
  assert.doesNotMatch(text, /Test No Overtime/);
  assert.doesNotMatch(text, /Test Cook/);
});

test('the summary title reads "... for the month of <Month Year>"', () => {
  const { text } = makePdf();
  assert.match(text, /Overtime Of Admin Branch For The Month Of September 2026/);
});

test('dates are dd-MMM-yyyy and times HH:mm everywhere', () => {
  const { text } = makePdf();
  const dates = text.match(/\b\d{1,2}[-/.][A-Za-z0-9]{2,3}[-/.]\d{4}\b/g) ?? [];
  assert.ok(dates.length > 0);
  dates.forEach((d) => assert.match(d, /^\d{2}-[A-Z][a-z]{2}-\d{4}$/, d));
  assert.doesNotMatch(text, /\b\d{1,2}:\d{2}(:\d{2})?\s?(AM|PM)\b/i, 'no 12-hour times');
  assert.match(text, /\b08:00\b/);
  assert.match(text, /\b19:00\b/);
});

test('both signature lines are printed', () => {
  const { text } = makePdf();
  assert.match(text, /Employee Signature/);
  assert.match(text, /Officer Signature/);
});

test('with every designation excluded there are no employee pages', () => {
  const { doc } = makePdf({ pdfExcludedDesignations: ['Superintendent', 'Driver', 'Cook', 'Mali'] });
  assert.equal(doc.getNumberOfPages(), 1);
});
