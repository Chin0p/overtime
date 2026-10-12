import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvHeaderToCanonical, parseRecordsCSV, buildRecordsTemplate } from '../src/parser/csvParser';
import { parseJSON, toDate, toTime } from '../src/parser/jsonParser';
import { mergeRecords } from '../src/parser/mergeRecords';
import { canon, load, personRows } from './fixtures';

const ymd = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);

// ---------------------------------------------------------------- dates
test('toDate: DAUMS month-first is the only month-first format', () => {
  assert.equal(ymd(toDate('09/01/2026 00:00:00', 'x')), '2026-9-1');
  assert.equal(toDate('13/01/2026 00:00:00', 'x'), null, 'there is no month 13');
});

test('toDate: day-first, named and ISO forms', () => {
  assert.equal(ymd(toDate('01-Sep-2026', 'x')), '2026-9-1');
  assert.equal(ymd(toDate('2026-09-01', 'x')), '2026-9-1');
  assert.equal(ymd(toDate('01-09-2026', 'x')), '2026-9-1');
  assert.equal(ymd(toDate('01.09.2026', 'x')), '2026-9-1');
});

test('toDate: nothing is guessed or rolled over', () => {
  assert.equal(toDate('31-Feb-2026', 'x'), null);
  assert.equal(toDate('31-09-2026', 'x'), null, '31 September does not exist');
  assert.equal(toDate('garbage', 'x'), null);
  assert.equal(toDate('', 'x'), null);
});

test('toDate: a bare day number needs the month from the file name', () => {
  assert.equal(ymd(toDate('15', 'attendance-sep-2026.json')), '2026-9-15');
  assert.equal(toDate('15', 'attendance.json'), null);
});

// ---------------------------------------------------------------- times
test('toTime: always 24-hour HH:mm', () => {
  assert.equal(toTime('08:56:56 AM'), '08:56');
  assert.equal(toTime('11:27:04 PM'), '23:27');
  assert.equal(toTime('12:05 AM'), '00:05');
  assert.equal(toTime('12:30 PM'), '12:30');
  assert.equal(toTime('1017'), '10:17');
  assert.equal(toTime('7:05'), '07:05');
  assert.equal(toTime('18:04:59'), '18:04');
});

test('toTime: values that are not real clock times are rejected', () => {
  for (const bad of ['13:20 PM', '10:75', '24:10', 'abc', '', '0:00 AM']) assert.equal(toTime(bad), null, `"${bad}"`);
});

// ---------------------------------------------------------------- parseJSON
test('parseJSON: dates leave as dd-MMM-yyyy and times as HH:mm', () => {
  const data = parseJSON([{ weekDate: '09/01/2026 00:00:00', erp: '1', fullName: 'A B', designation: 'Cook', checkIn: '08:56:56 AM', checkOut: '05:30:00 PM' }], 'x');
  assert.deepEqual(data.dates, ['01-Sep-2026']);
  const cell = data.employees[0].attendance?.['01-Sep-2026'];
  assert.equal(cell?.timeIn, '08:56');
  assert.equal(cell?.timeOut, '17:30');
});

test('parseJSON: bad rows are skipped with a warning, good rows stay', () => {
  const rows = [
    ...personRows('1', 'GOOD ONE', 'Cook', [{ d: 1, in: '08:00', out: '17:00' }]),
    { weekDate: 'garbage', erp: '1', fullName: 'GOOD ONE', designation: 'Cook' },
    { weekDate: '09/02/2026 00:00:00', erp: '', fullName: 'NO ERP', designation: 'Cook' },
    { weekDate: '09/03/2026 00:00:00', erp: '1', fullName: 'GOOD ONE', designation: 'Cook', checkIn: '25:99', checkOut: '17:00' },
  ];
  const data = parseJSON(rows, 'x');
  assert.equal(data.employees.length, 1);
  assert.equal(data.warnings?.length, 3);
  assert.match(data.warnings![0], /unparseable date/);
  assert.match(data.warnings![1], /missing ERP/);
  assert.match(data.warnings![2], /not a valid time/);
});

test('parseJSON: a blank or placeholder punch means no punch, not an error', () => {
  const data = parseJSON([{ weekDate: '09/01/2026 00:00:00', erp: '1', fullName: 'A', designation: 'Cook', checkIn: '-', checkOut: '' }], 'x');
  assert.equal(data.warnings?.length ?? 0, 0);
});

test('parseJSON: an empty file is an error', () => {
  assert.throws(() => parseJSON([], 'x'), /non-empty array/);
});

test('parseJSON: a holiday status in the file is reported once, for Settings to adopt', () => {
  const data = parseJSON([{ weekDate: '09/16/2026 00:00:00', erp: '1', fullName: 'A', designation: 'Cook', status: 'H' }], 'x');
  assert.deepEqual(data.holidays, [{ date: '16-Sep-2026', name: 'Holiday' }]);
});

test('parseJSON: a category in the file counts only when it is one of the three known values', () => {
  const rows = (category: string) => [{ weekDate: '09/01/2026 00:00:00', erp: '1', fullName: 'A', designation: 'Cook', category }];
  assert.equal(parseJSON(rows('Exempt'), 'x').employees[0].category, 'exempt');
  assert.equal(parseJSON(rows('Official'), 'x').employees[0].category, 'official', 'the file beats the keyword guess for Cook');
  assert.equal(parseJSON(rows('whatever'), 'x').employees[0].category, 'support', 'unknown text is ignored, so the guess for Cook applies');
});

// ---------------------------------------------------------------- CSV additions
test('CSV: header dates dd-mm-yyyy become dd-MMM-yyyy; cells like 0800:1600 become punches', () => {
  assert.equal(csvHeaderToCanonical('01-08-2026'), '01-Aug-2026');
  assert.equal(csvHeaderToCanonical('designation'), null);
  const data = parseRecordsCSV('erp,name,designation,01-08-2026,02-08-2026\n4747,tariq butt,electrician,0800:1600,0800:1830\n');
  assert.deepEqual(data.dates, ['01-Aug-2026', '02-Aug-2026']);
  const e = data.employees[0];
  assert.equal(e.erp, '4747');
  assert.equal(e.name, 'Tariq Butt');
  assert.equal(e.designation, 'Electrician');
  assert.deepEqual(e.attendance?.['02-Aug-2026'], { timeIn: '08:00', timeOut: '18:30' });
});

test('CSV: a row without attendance is skipped with a warning; a wrong header is an error', () => {
  const data = parseRecordsCSV('erp,name,designation,01-08-2026\n1,a b,cook,0800:1600\n2,c d,driver,\n');
  assert.equal(data.employees.length, 1);
  assert.match(data.warnings![0], /no attendance cells/);
  assert.throws(() => parseRecordsCSV('hello\nworld'), /header must start with erp, name, designation/);
  assert.throws(() => parseRecordsCSV('erp,name,designation,31-02-2026\n1,a,b,0800:1600'), /no dd-mm-yyyy date columns/);
});

test('CSV: the template is a header the parser accepts', () => {
  const template = buildRecordsTemplate(['01-Aug-2026', '02-Aug-2026']);
  assert.equal(template, 'erp,name,designation,01-08-2026,02-08-2026\n');
  assert.throws(() => parseRecordsCSV(template), /at least one employee row/);
  assert.doesNotThrow(() => parseRecordsCSV(template + '9,test person,cook,0800:1600,\n'));
});

// ---------------------------------------------------------------- merge
test('mergeRecords: loaded people keep their name and designation, new days and new people are added', () => {
  const existing = load(personRows('1', 'LOADED NAME', 'Cook', [{ d: 16, in: '08:00', out: '17:00' }]));
  const incoming = load([
    ...personRows('1', 'Other Name', 'Driver', [{ d: 17, in: '08:00', out: '17:00' }]),
    ...personRows('2', 'NEW PERSON', 'Cook', [{ d: 17, in: '08:00', out: '17:00' }]),
  ]);
  const merged = mergeRecords(existing, incoming);
  assert.equal(merged.addedEmployees, 1);
  assert.equal(merged.updatedEmployees, 1);
  assert.deepEqual(merged.data.dates, [canon(16), canon(17)]);
  const one = merged.data.employees.find((e) => e.erp === '1')!;
  assert.equal(one.name, 'Loaded Name');
  assert.equal(one.designation, 'Cook');
  assert.deepEqual(Object.keys(one.attendance ?? {}).sort(), [canon(16), canon(17)]);
});

test('mergeRecords: a day on both sides takes the incoming values', () => {
  const existing = load(personRows('1', 'A', 'Cook', [{ d: 16, in: '08:00', out: '17:00' }]));
  const incoming = load(personRows('1', 'A', 'Cook', [{ d: 16, in: '09:00', out: '19:00' }]));
  const merged = mergeRecords(existing, incoming);
  assert.deepEqual(merged.data.employees[0].attendance?.[canon(16)], { timeIn: '09:00', timeOut: '19:00' });
});
