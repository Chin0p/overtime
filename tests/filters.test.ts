import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processEmployees } from '../src/engine/otCalculator';
import {
  applySidebarView,
  buildHolidayOptions,
  matchesFilters,
  NO_FILTERS,
  WEEKEND_KEY,
  type SidebarFilters,
} from '../src/store/useSidebarView';
import { canon, load, personRows, policy } from './fixtures';

const worked = { in: '08:00', out: '19:00' };

// A: official, overtime on a weekday and on a Saturday, one excluded weekday.
// B: support (dynamic), only a holiday attendance, so an amount but no overtime hours.
// C: official with no basic pay: hours but no amount.
// D: Driver (fixed rate), nothing worked.
// E: exempt (Mali), worked late but is not paid.
function build() {
  const p = policy({ roundingMode: 'floor', designationCategories: { Mali: 'exempt' }, employeeExcludedDays: { '90001': [canon(2)] } });
  const rows = [
    ...personRows('90001', 'TEST ALPHA', 'Superintendent', [{ d: 1, ...worked }, { d: 2, ...worked }, { d: 5, in: '10:00', out: '14:00' }]),
    ...personRows('90003', 'TEST BRAVO', 'Cook', [{ d: 7, in: '09:00', out: '12:00' }]),
    ...personRows('90006', 'TEST CHARLIE', 'Superintendent', [{ d: 1, ...worked }]),
    ...personRows('90002', 'TEST DELTA', 'Driver', [{ d: 1, in: '08:00', out: '16:00' }]),
    ...personRows('90004', 'TEST ECHO', 'Mali', [{ d: 1, ...worked }]),
  ];
  return processEmployees(load(rows), { policy: p }, { '90001': 52800, '90003': 35200 }, [{ date: canon(7), name: 'Test Holiday' }]);
}
const employees = build();
const who = (f: Partial<SidebarFilters>, list = employees) =>
  list.filter((e) => matchesFilters(e, { ...NO_FILTERS, ...f })).map((e) => e.erp).sort();

test('no filter shows everyone', () => {
  assert.deepEqual(who({}), ['90001', '90002', '90003', '90004', '90006']);
});

test('Overtime: has hours, has amount, both, or none', () => {
  assert.deepEqual(who({ overtime: ['hours'] }), ['90001', '90006'], 'B has no hours, E is exempt');
  assert.deepEqual(who({ overtime: ['amount'] }), ['90001', '90003'], 'holiday pay is an amount; C has no pay set');
  assert.deepEqual(who({ overtime: ['hours', 'amount'] }), ['90001'], 'both must hold');
  assert.deepEqual(who({ overtime: ['none'] }), ['90002', '90004'], 'nothing earned and no hours');
  assert.deepEqual(who({ overtime: ['none', 'hours'] }), [], 'contradictory choices match nobody');
});

test('Eligibility, Category and Pay', () => {
  assert.deepEqual(who({ eligibility: 'exempt' }), ['90004']);
  assert.deepEqual(who({ eligibility: 'paid' }), ['90001', '90002', '90003', '90006']);
  assert.deepEqual(who({ category: 'support' }), ['90002', '90003'], 'an exempt person is in the Exempt category, not Support');
  assert.deepEqual(who({ category: 'official' }), ['90001', '90006']);
  assert.deepEqual(who({ pay: 'fixed' }), ['90002']);
  assert.deepEqual(who({ pay: 'dynamic' }), ['90001', '90003', '90004', '90006']);
  assert.deepEqual(who({ pay: 'missing' }), ['90006'], 'an exempt person with no pay is not "missing"');
});

test('Has excluded days', () => {
  assert.deepEqual(who({ hasExcluded: true }), ['90001']);
});

test('Holiday availed: any of the chosen holidays; weekends are one option; excluded days do not count', () => {
  assert.deepEqual(who({ holidays: [canon(7)] }), ['90003']);
  assert.deepEqual(who({ holidays: [WEEKEND_KEY] }), ['90001']);
  assert.deepEqual(who({ holidays: [canon(7), WEEKEND_KEY] }), ['90001', '90003']);
  const p = policy({ designationCategories: { Mali: 'exempt' }, employeeExcludedDays: { '90001': [canon(5)] } });
  const rows = personRows('90001', 'TEST ALPHA', 'Superintendent', [{ d: 5, in: '10:00', out: '14:00' }]);
  const excluded = processEmployees(load(rows), { policy: p }, { '90001': 52800 }, []);
  assert.deepEqual(who({ holidays: [WEEKEND_KEY] }, excluded), []);
});

test('filters combine: every one has to match', () => {
  assert.deepEqual(who({ pay: 'dynamic', overtime: ['amount'] }), ['90001', '90003']);
  assert.deepEqual(who({ pay: 'dynamic', overtime: ['amount'], category: 'official' }), ['90001']);
  assert.deepEqual(who({ category: 'support', overtime: ['hours'] }), []);
});

test('holiday options: named holidays in date order with their date, then Saturdays and Sundays', () => {
  const options = buildHolidayOptions(employees);
  assert.deepEqual(options, [
    { key: canon(7), label: 'Test Holiday · 07-Sep-2026' },
    { key: WEEKEND_KEY, label: 'Saturdays & Sundays' },
  ]);
});

test('the list can also be sorted after filtering', () => {
  const list = applySidebarView(employees, { filters: { ...NO_FILTERS, overtime: ['amount'] }, sortKey: 'amount', sortOrder: 'desc' });
  assert.deepEqual(list.map((e) => e.erp), ['90001', '90003']);
  assert.ok(list[0].totalAmount > list[1].totalAmount);
});
