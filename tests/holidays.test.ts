import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHolidayIndex, getHolidayName, getHolidayNameFromIndex, isHoliday } from '../src/engine/holidayChecker';
import { seedFileHolidays } from '../src/lib/seedHolidays';

const gazetted = [{ date: '16-Sep-2026', name: 'Test Holiday' }];

test('Saturdays and Sundays are holidays named after the day', () => {
  assert.equal(getHolidayName('05-Sep-2026', []), 'Saturday');
  assert.equal(getHolidayName('06-Sep-2026', []), 'Sunday');
  assert.equal(isHoliday('07-Sep-2026', []), false, 'a Monday is a working day');
});

test('a gazetted date is a holiday with its name, in any accepted date format', () => {
  assert.equal(getHolidayName('16-Sep-2026', gazetted), 'Test Holiday');
  assert.equal(getHolidayName('2026-09-16', gazetted), 'Test Holiday');
  assert.equal(getHolidayName('17-Sep-2026', gazetted), null);
  const index = buildHolidayIndex(gazetted);
  assert.equal(getHolidayNameFromIndex(new Date(2026, 8, 16), index), 'Test Holiday');
});

test('seeding: a flagged date is copied into Settings once and remembered', () => {
  const first = seedFileHolidays([{ date: '16-Sep-2026', name: 'Test Holiday' }], [], []);
  assert.equal(first.changed, true);
  assert.deepEqual(first.holidays, [{ date: '16-Sep-2026', name: 'Test Holiday' }]);
  assert.deepEqual(first.seen, ['16-Sep-2026']);

  // The user then deletes it. Loading the same file again must not bring it back.
  const second = seedFileHolidays([{ date: '16-Sep-2026', name: 'Test Holiday' }], first.seen, []);
  assert.equal(second.changed, false);
  assert.deepEqual(second.holidays, []);
});

test('seeding: weekends are never listed, an unnamed holiday is called Holiday, existing ones are kept', () => {
  const r = seedFileHolidays(
    [{ date: '05-Sep-2026', name: 'x' }, { date: '16-Sep-2026', name: '' }],
    [],
    [{ date: '20-Sep-2026', name: 'Mine' }],
  );
  assert.deepEqual(r.holidays, [{ date: '20-Sep-2026', name: 'Mine' }, { date: '16-Sep-2026', name: 'Holiday' }]);
  assert.deepEqual(r.seen.sort(), ['05-Sep-2026', '16-Sep-2026']);
});
