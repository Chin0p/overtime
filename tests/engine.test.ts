import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processEmployees, computeOTHours, lateAdjustmentHours, netOvertimeHours } from '../src/engine/otCalculator';
import type { Holiday, ProcessedEmployee } from '../src/types';
import { canon, load, personRows, policy, WEEKDAYS, type Day } from './fixtures';

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

// Official staff, dynamic rate: 52,800 / 176 = 300 an hour, 52,800 / 30 = 1,760 for a holiday.
const OFFICIAL = { erp: '90001', name: 'TEST OFFICIAL ONE', designation: 'Superintendent' };
// Support staff on a dynamic rate: 35,200 / 176 = 200 an hour.
const COOK = { erp: '90003', name: 'TEST COOK', designation: 'Cook' };
// Fixed rate (Driver, Naib Qasid): 80 an hour, 600 on a holiday.
const DRIVER = { erp: '90002', name: 'TEST DRIVER', designation: 'Driver' };
const NAIB = { erp: '90005', name: 'TEST NAIB QASID', designation: 'Naib Qasid' };
const PAY: Record<string, number> = { '90001': 52800, '90003': 35200 };

type Person = typeof OFFICIAL;
const rowsOf = (p: Person, days: Day[]) => personRows(p.erp, p.name, p.designation, days);

function run(
  people: Array<[Person, Day[]]>,
  opts: { policy?: Parameters<typeof policy>[0]; holidays?: Holiday[]; pay?: Record<string, number> } = {},
): Record<string, ProcessedEmployee> {
  const data = load(people.flatMap(([p, days]) => rowsOf(p, days)));
  const result = processEmployees(data, { policy: policy(opts.policy) }, opts.pay ?? PAY, opts.holidays ?? []);
  return Object.fromEntries(result.map((e) => [e.erp, e]));
}
const day = (r: ProcessedEmployee, d: number) => {
  const rec = r.records.find((x) => x.date === canon(d));
  assert.ok(rec, `no record for ${canon(d)}`);
  return rec;
};

// ---------------------------------------------------------------- the pure helpers
test('computeOTHours: below the minimum is nothing, then Floor or Round', () => {
  assert.equal(computeOTHours(0.6, 1, 'floor'), 0);
  assert.equal(computeOTHours(59 / 60, 1, 'round'), 0, '59 minutes is under a 60 minute minimum');
  assert.equal(computeOTHours(1, 1, 'floor'), 1, 'exactly the minimum is paid');
  assert.equal(computeOTHours(1.6, 1, 'floor'), 1, '1h 36m floors to 1h');
  assert.equal(computeOTHours(1.6, 1, 'round'), 2, '1h 36m rounds to 2h');
  assert.equal(computeOTHours(0, 1, 'round'), 0);
});

test('late arrival is deducted in exact minutes, before threshold and rounding', () => {
  near(lateAdjustmentHours(50 / 60), 50 / 60);
  near(netOvertimeHours(2, 50 / 60, true), 2 - 50 / 60);
  assert.equal(netOvertimeHours(2, 50 / 60, false), 2, 'toggle off: nothing is deducted');
  assert.equal(netOvertimeHours(0.5, 1, true), 0, 'never below zero');
});

// ---------------------------------------------------------------- office timing
test('office timing: file shift start minus grace; overtime starts one shift later', () => {
  const r = run([
    [OFFICIAL, [{ d: 1, in: '08:00', out: '17:00', shiftStart: '08:10:00' }]],
    [COOK, [{ d: 1, in: '09:00', out: '18:00', shiftStart: '09:10:00' }]],
  ]);
  assert.equal(day(r['90001'], 1).officeTiming, '08:00-16:00');
  assert.equal(day(r['90003'], 1).officeTiming, '09:00-17:00');
  assert.equal(day(r['90001'], 1).otHours, 1, '17:00 is one hour after 16:00');
  assert.equal(day(r['90003'], 1).otHours, 1, '18:00 is one hour after 17:00');
});

test('a row with no usable shift start takes the most common one of that date, else 08:00 plus grace', () => {
  const r = run([
    [OFFICIAL, [{ d: 2, in: '09:00', out: '18:00', shiftStart: '09:10:00' }, { d: 3, in: '08:00', out: '17:00', shiftStart: null }, { d: 4, in: '08:00', out: '17:00', shiftStart: '15:10:00' }]],
    [COOK, [{ d: 2, in: '09:00', out: '18:00', shiftStart: '09:10:00' }, { d: 4, in: '08:00', out: '17:00', shiftStart: '08:10:00' }]],
    [DRIVER, [{ d: 2, in: '09:00', out: '18:00', shiftStart: null }]],
  ]);
  assert.equal(day(r['90002'], 2).officeTiming, '09:00-17:00', 'blank follows the other two on that date');
  assert.equal(day(r['90001'], 3).officeTiming, '08:00-16:00', 'nobody has a start on that date');
  assert.equal(day(r['90001'], 4).officeTiming, '08:00-16:00', 'an evening 15:10 is bad data, so the date start is used');
});

test('late limit is the shift start: arriving at 08:10 is on time, 09:00 is 50 minutes late', () => {
  const on = run([[OFFICIAL, [{ d: 1, in: '08:10', out: '18:00' }]]], { policy: { lateArrivalToggle: true } });
  assert.equal(day(on['90001'], 1).adjustment, 0);
  const late = run([[OFFICIAL, [{ d: 1, in: '09:00', out: '18:00' }]]], { policy: { lateArrivalToggle: true, roundingMode: 'floor' } });
  near(day(late['90001'], 1).adjustment, 50 / 60);
  // 2h gross - 50 min = 1h 10m, Floor gives 1h, which is paid at 300 an hour.
  assert.equal(day(late['90001'], 1).otHours, 1);
  assert.equal(day(late['90001'], 1).amount, 300);
});

test('arriving inside the grace window (after 08:00, before 08:10) is not late', () => {
  const r = run([[OFFICIAL, [{ d: 1, in: '08:05', out: '18:00' }]]], { policy: { lateArrivalToggle: true, roundingMode: 'floor' } });
  assert.equal(day(r['90001'], 1).adjustment, 0);
  assert.equal(day(r['90001'], 1).otHours, 2);
});

test('late arrival toggle off: nothing is deducted', () => {
  const r = run([[OFFICIAL, [{ d: 1, in: '09:00', out: '18:00' }]]], { policy: { lateArrivalToggle: false, roundingMode: 'floor' } });
  assert.equal(day(r['90001'], 1).otHours, 2);
});

// ---------------------------------------------------------------- threshold, rounding, caps
test('minimum threshold: 59 minutes is not paid, 60 is', () => {
  const r = run([[OFFICIAL, [{ d: 1, in: '08:00', out: '16:59' }, { d: 2, in: '08:00', out: '17:00' }]]]);
  assert.equal(day(r['90001'], 1).otHours, 0);
  assert.equal(day(r['90001'], 2).otHours, 1);
  const strict = run([[OFFICIAL, [{ d: 2, in: '08:00', out: '17:00' }]]], { policy: { minThresholdMinutes: 90 } });
  assert.equal(day(strict['90001'], 2).otHours, 0, 'a 90 minute minimum rejects one hour');
});

test('rounding mode: 2h 30m is 2h with Floor and 3h with Round', () => {
  const floor = run([[COOK, [{ d: 1, in: '08:00', out: '18:30' }]]], { policy: { roundingMode: 'floor' } });
  assert.equal(day(floor['90003'], 1).otHours, 2);
  assert.equal(day(floor['90003'], 1).amount, 400, '2h at 200 an hour');
  const rounded = run([[COOK, [{ d: 1, in: '08:00', out: '18:30' }]]], { policy: { roundingMode: 'round' } });
  assert.equal(day(rounded['90003'], 1).otHours, 3);
  assert.equal(day(rounded['90003'], 1).amount, 550, '3h would be 600, the daily maximum is 550');
});

test('daily cap and daily maximum: dynamic 3h / 550, fixed rate 6h / 480', () => {
  const r = run([
    [OFFICIAL, [{ d: 1, in: '08:00', out: '22:00' }]],
    [DRIVER, [{ d: 1, in: '08:00', out: '22:00' }, { d: 2, in: '08:00', out: '23:00' }]],
  ]);
  assert.equal(day(r['90001'], 1).otHours, 3);
  assert.equal(day(r['90001'], 1).amount, 550);
  assert.equal(day(r['90002'], 1).otHours, 6);
  assert.equal(day(r['90002'], 1).amount, 480, '6h at 80 an hour');
  assert.equal(day(r['90002'], 2).otHours, 6, '7h of overtime is capped at 6h');
});

test('a dynamic-rate employee without basic pay earns hours but no amount', () => {
  const r = run([[OFFICIAL, [{ d: 1, in: '08:00', out: '19:00' }]]], { pay: {} });
  assert.equal(day(r['90001'], 1).otHours, 3);
  assert.equal(day(r['90001'], 1).amount, 0);
});

// ---------------------------------------------------------------- monthly cap
// 14 working days: two of 1h, then 2h and 3h alternating. A 12 day cap keeps the best 12.
const OT_OUT = { 1: '17:00', 2: '18:00', 3: '19:00' } as const;
const patterned = (): Day[] =>
  [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18].map((d, i) => ({ d, in: '08:00', out: OT_OUT[i < 2 ? 1 : i % 2 === 0 ? 2 : 3] }));

test('monthly day cap: the 12 highest-overtime days are paid, the rest are flagged and unpaid', () => {
  const r = run([[OFFICIAL, patterned()]]);
  const e = r['90001'];
  const dropped = e.records.filter((x) => x.exceededMonthlyCap);
  assert.deepEqual(dropped.map((x) => x.date), [canon(1), canon(2)], 'the two 1h days lose');
  dropped.forEach((x) => {
    assert.equal(x.amount, 0);
    assert.match(x.remarks, /Exceeded monthly cap/);
  });
  assert.equal(e.totalAmount, 12 * 550);
  assert.equal(e.totalOTHours, 6 * 2 + 6 * 3, 'hours of unpaid days are not counted');
});

test('monthly day cap: an excluded day frees its slot', () => {
  const r = run([[OFFICIAL, patterned()]], { policy: { employeeExcludedDays: { '90001': [canon(16)] } } });
  const e = r['90001'];
  assert.equal(e.records.filter((x) => x.exceededMonthlyCap).length, 1, '13 days compete for 12 slots, not 14');
  assert.equal(day(e, 16).excluded, true);
  assert.ok(!day(e, 16).exceededMonthlyCap);
});

test('monthly day cap: holidays never count and are always paid', () => {
  const days: Day[] = [...patterned(), { d: 21, in: '09:00', out: '12:00' }];
  const r = run([[OFFICIAL, days]], { holidays: [{ date: canon(21), name: 'Test Holiday' }] });
  assert.equal(day(r['90001'], 21).amount, 1760);
  assert.ok(!day(r['90001'], 21).exceededMonthlyCap);
  assert.equal(r['90001'].records.filter((x) => x.exceededMonthlyCap).length, 2);
});

test('monthly day cap: Drivers are exempt by default, Naib Qasid only when switched on, dynamic never', () => {
  const people: Array<[Person, Day[]]> = [[DRIVER, patterned()], [NAIB, patterned()]];
  const byDefault = run(people);
  assert.equal(byDefault['90002'].totalAmount, 2 * 80 + 6 * 160 + 6 * 240, 'no day is dropped');
  assert.equal(byDefault['90005'].totalAmount, 6 * 160 + 6 * 240, 'two 1h days are dropped');
  const switched = run(people, { policy: { designationCapExempt: { 'Naib Qasid': true } } });
  assert.equal(switched['90005'].totalAmount, 2 * 80 + 6 * 160 + 6 * 240);
  const dynamic = run([[OFFICIAL, patterned()]], { policy: { designationCapExempt: { Superintendent: true } } });
  assert.equal(dynamic['90001'].records.filter((x) => x.exceededMonthlyCap).length, 2, 'the switch only exists for fixed-rate designations');
});

// ---------------------------------------------------------------- holidays
test('holidays come from Settings only; paid on attendance at the holiday rate', () => {
  const holidays = [{ date: canon(7), name: 'Test Holiday' }];
  const r = run([
    [OFFICIAL, [{ d: 7, in: '09:00', out: '12:00' }]],
    [COOK, [{ d: 7, in: '09:00', out: '12:00' }]],
    [DRIVER, [{ d: 7, in: '09:00', out: '12:00' }]],
    [NAIB, [{ d: 7 }]],
  ], { holidays });
  assert.equal(day(r['90001'], 7).isHoliday, true);
  assert.equal(day(r['90001'], 7).otHours, 0, 'a holiday carries no overtime hours');
  assert.equal(day(r['90001'], 7).amount, 1760, '52,800 / 30');
  assert.equal(day(r['90003'], 7).amount, 1173, '35,200 / 30 = 1,173.3, rounded');
  assert.equal(day(r['90002'], 7).amount, 600, 'fixed rate holiday pay');
  assert.equal(day(r['90005'], 7).amount, 0, 'no punches, no holiday pay');
  assert.equal(day(r['90001'], 7).remarks, 'Test Holiday');
});

test('a holiday flag in the file is ignored; Settings decides', () => {
  const r = run([[OFFICIAL, [{ d: 8, in: '08:00', out: '19:00', isHoliday: '1', status: 'H' }]]]);
  assert.equal(day(r['90001'], 8).isHoliday, false);
  assert.equal(day(r['90001'], 8).otHours, 3);
});

test('Saturdays and Sundays are holidays; late arrival is not deducted on them', () => {
  const r = run([[OFFICIAL, [{ d: 5, in: '11:00', out: '15:00' }, { d: 6, in: '09:00', out: '10:00' }]]], { policy: { lateArrivalToggle: true } });
  assert.equal(day(r['90001'], 5).isHoliday, true);
  assert.equal(day(r['90001'], 5).remarks, 'Saturday');
  assert.equal(day(r['90001'], 5).adjustment, 0);
  assert.equal(day(r['90001'], 6).remarks, 'Sunday');
  assert.equal(day(r['90001'], 5).amount, 1760);
});

// ---------------------------------------------------------------- exclusions and exempt
test('excluded days stay visible as "Excluded" but count in no total', () => {
  const days = [1, 2, 3].map((d) => ({ d, in: '08:00', out: '19:00' }));
  const r = run([[OFFICIAL, days]], { policy: { employeeExcludedDays: { '90001': [canon(2)] } } });
  const e = r['90001'];
  assert.equal(day(e, 2).excluded, true);
  assert.equal(day(e, 2).remarks, 'Excluded');
  assert.equal(e.totalAmount, 2 * 550);
  assert.equal(e.totalOTHours, 6);
});

test('exclude all holidays leaves out attended holidays and weekends, not days without punches', () => {
  const holidays = [{ date: canon(7), name: 'Test Holiday' }, { date: canon(9), name: 'Other Holiday' }];
  const days: Day[] = [{ d: 5, in: '10:00', out: '14:00' }, { d: 7, in: '10:00', out: '14:00' }, { d: 9 }, { d: 10, in: '08:00', out: '19:00' }];
  const r = run([[OFFICIAL, days]], { holidays, policy: { employeeExcludeHolidays: { '90001': true } } });
  const e = r['90001'];
  assert.equal(day(e, 5).excluded, true);
  assert.equal(day(e, 7).excluded, true);
  assert.ok(!day(e, 9).excluded, 'a holiday with no punches is not an attended holiday');
  assert.equal(e.totalAmount, 550, 'only the working day is paid');
});

test('exempt employees are kept with no hours and no amount', () => {
  const byDesignation = run([[OFFICIAL, [{ d: 1, in: '08:00', out: '19:00' }]]], { policy: { designationCategories: { Superintendent: 'exempt' } } });
  assert.equal(byDesignation['90001'].category, 'exempt');
  assert.equal(byDesignation['90001'].totalAmount, 0);
  assert.equal(byDesignation['90001'].totalOTHours, 0);
  assert.equal(byDesignation['90001'].records.length, 1);
  const personal = run([[OFFICIAL, [{ d: 1, in: '08:00', out: '19:00' }]]], { policy: { employeeEligibility: { '90001': 'exempt' } } });
  assert.equal(personal['90001'].totalAmount, 0);
});

// ---------------------------------------------------------------- rate types
test('fixed-rate staff are Drivers and Naib Qasids; Settings can change a designation', () => {
  const r = run([[DRIVER, [{ d: 1 }]], [NAIB, [{ d: 1 }]], [COOK, [{ d: 1 }]]]);
  assert.equal(r['90002'].rateType, 'fixed');
  assert.equal(r['90005'].rateType, 'fixed');
  assert.equal(r['90002'].hourlyRate, 80);
  assert.equal(r['90002'].dayRate, 600);
  assert.equal(r['90003'].rateType, 'dynamic');
  assert.equal(r['90003'].hourlyRate, 200);
  const changed = run([[COOK, [{ d: 1 }]]], { policy: { designationRateTypes: { Cook: 'fixed' } } });
  assert.equal(changed['90003'].rateType, 'fixed');
});

test('anchor: a fixed-rate employee leaving at 18:04 on a 08:10 shift earns 2h and 160', () => {
  const r = run([[NAIB, [{ d: 1, in: '06:12', out: '18:04', shiftStart: '08:10:00' }]]]);
  assert.equal(day(r['90005'], 1).officeTiming, '08:00-16:00');
  assert.equal(day(r['90005'], 1).otHours, 2);
  assert.equal(day(r['90005'], 1).amount, 160);
});

test('a month of working days with no punches produces no overtime', () => {
  const r = run([[OFFICIAL, WEEKDAYS.map((d) => ({ d }))]]);
  assert.equal(r['90001'].totalOTHours, 0);
  assert.equal(r['90001'].totalAmount, 0);
});
