import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flexibleParseDate, formatAmount, formatCanonicalDate, formatCurrency, formatDuration, formatTimeDisplay, parseHHMM, toTitleCase } from '../src/lib/utils';
import { round } from '../src/lib/math';

test('dates are written dd-MMM-yyyy', () => {
  assert.equal(formatCanonicalDate(new Date(2026, 8, 1)), '01-Sep-2026');
  assert.equal(formatCanonicalDate(flexibleParseDate('2026-09-01')), '01-Sep-2026');
  assert.equal(formatCanonicalDate(flexibleParseDate('01-Sep-2026')), '01-Sep-2026');
  assert.ok(Number.isNaN(flexibleParseDate('garbage').getTime()));
});

test('clock times parse from HH:mm and HHmm', () => {
  assert.equal(parseHHMM('08:30'), 8.5);
  assert.equal(parseHHMM('1700'), 17);
});

test('durations read as "1h 30m", "45m", "8h 0m" (this is the current behaviour)', () => {
  assert.equal(formatDuration(1.5), '1h 30m');
  assert.equal(formatDuration(0.75), '45m');
  assert.equal(formatDuration(8), '8h 0m');
  assert.equal(formatDuration(0), '0m');
});

test('amounts and currency (current behaviour: "Rs" on the stat cards)', () => {
  assert.equal(formatAmount(1234567), '1,234,567');
  assert.match(formatCurrency(42000), /^Rs\s42,000$/, 'the space may be a non-breaking one');
});

test('empty times show a dash; names are title-cased', () => {
  assert.equal(formatTimeDisplay('08:56'), '08:56');
  assert.equal(formatTimeDisplay(''), '—');
  assert.equal(toTitleCase('MR. TEST PERSON'), 'Mr. Test Person');
});

test('round: Floor drops the fraction, Round goes to the nearest whole number', () => {
  assert.equal(round(2.9, 'floor'), 2);
  assert.equal(round(2.5, 'round'), 3);
  assert.equal(round(2.4, 'round'), 2);
});
