import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSortDir, SUMMARY_SORT_OPTIONS, sortSummary } from '../src/pdf/summarySort';
import type { ProcessedEmployee } from '../src/types';

const emp = (erp: string, name: string, designation: string, over: Partial<ProcessedEmployee> = {}) =>
  ({ erp, name, designation, category: 'official', rateType: 'dynamic', basicPay: 0, totalAmount: 0, ...over }) as ProcessedEmployee;

const list = [
  emp('20', 'Bilal', 'Driver', { category: 'support', rateType: 'fixed', basicPay: 0, totalAmount: 480 }),
  emp('3', 'Asad', 'Cook', { category: 'support', rateType: 'dynamic', basicPay: 35200, totalAmount: 1200 }),
  emp('100', 'Chaudhry', 'Superintendent', { category: 'official', rateType: 'dynamic', basicPay: 52800, totalAmount: 1200 }),
];
const erps = (l: ProcessedEmployee[]) => l.map((e) => e.erp);

test('every sort key works in both directions', () => {
  assert.deepEqual(erps(sortSummary(list, 'name', 'asc')), ['3', '20', '100']);
  assert.deepEqual(erps(sortSummary(list, 'name', 'desc')), ['100', '20', '3']);
  assert.deepEqual(erps(sortSummary(list, 'erp', 'asc')), ['3', '20', '100'], 'ERP sorts as a number, not as text');
  assert.deepEqual(erps(sortSummary(list, 'designation', 'asc')), ['3', '20', '100']);
  assert.deepEqual(erps(sortSummary(list, 'basicPay', 'desc')), ['100', '3', '20']);
  assert.deepEqual(erps(sortSummary(list, 'category', 'asc')), ['100', '3', '20'], 'official before support, ties by name');
  assert.deepEqual(erps(sortSummary(list, 'rateType', 'asc')), ['3', '100', '20'], 'dynamic before fixed, ties by name');
});

test('ties in amount fall back to name', () => {
  assert.deepEqual(erps(sortSummary(list, 'amount', 'desc')), ['3', '100', '20']);
  assert.deepEqual(erps(sortSummary(list, 'amount', 'asc')), ['20', '3', '100']);
});

test('sorting does not change the list it was given', () => {
  const copy = [...list];
  sortSummary(list, 'name', 'desc');
  assert.deepEqual(list, copy);
});

test('default direction: amount and basic pay highest first, the rest ascending', () => {
  assert.equal(defaultSortDir('amount'), 'desc');
  assert.equal(defaultSortDir('basicPay'), 'desc');
  assert.equal(defaultSortDir('name'), 'asc');
  assert.equal(SUMMARY_SORT_OPTIONS.length, 7);
});
