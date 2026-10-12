import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferIsSupport, isDriver, isFixedRateRole, resolveCapExempt, resolveCategory, resolveRateType } from '../src/parser/parserUtils';

const none = { designationCategories: {}, employeeEligibility: {} };

test('category order: personal override, designation rule, file category, then the keyword guess', () => {
  const cook = { erp: '1', designation: 'Cook' };
  assert.equal(resolveCategory(cook, none), 'support', 'keyword guess');
  assert.equal(resolveCategory({ ...cook, category: 'official' }, none), 'official', 'the file beats the guess');
  assert.equal(resolveCategory({ ...cook, category: 'official' }, { ...none, designationCategories: { Cook: 'exempt' } }), 'exempt', 'Settings beats the file');
  assert.equal(resolveCategory(cook, { ...none, designationCategories: { Cook: 'official' }, employeeEligibility: { '1': 'exempt' } }), 'exempt', 'a personal exempt beats everything');
});

test('"included" pays someone whose designation or file says exempt', () => {
  const emp = { erp: '1', designation: 'Cook', category: 'exempt' as const };
  assert.equal(resolveCategory(emp, none), 'exempt');
  assert.equal(resolveCategory(emp, { ...none, employeeEligibility: { '1': 'included' } }), 'support', 'falls back to the guess');
});

test('keyword guess for the designations in use (a change to the list shows up here)', () => {
  const support = ['Driver', 'Naib Qasid', 'Mess Waiter', 'Cook', 'Sweeper', 'Electrician', 'Assistant Electrician', 'Carpenter', 'Plumber', 'Pump Operator', 'Office Boy', 'Security Guard', 'Dish Washer', 'Mali'];
  const official = ['Superintendent', 'Deputy Superintendent', 'Assistant Superintendent', 'Senior Executive', 'Junior Executive'];
  support.forEach((d) => assert.equal(inferIsSupport(undefined, undefined, d), true, d));
  official.forEach((d) => assert.equal(inferIsSupport(undefined, undefined, d), false, d));
  assert.equal(inferIsSupport(undefined, 'Official staff', 'Cook'), false, 'a stated category beats the keywords');
});

test('fixed-rate roles are Driver and Naib Qasid only; Settings can override', () => {
  assert.equal(isFixedRateRole('Driver'), true);
  assert.equal(isFixedRateRole('naib qasid'), true);
  assert.equal(isFixedRateRole('Cook'), false);
  assert.equal(resolveRateType('Cook', {}), 'dynamic');
  assert.equal(resolveRateType('Cook', { designationRateTypes: { Cook: 'fixed' } }), 'fixed');
  assert.equal(resolveRateType('Driver', { designationRateTypes: { Driver: 'dynamic' } }), 'dynamic');
});

test('the monthly cap switch exists only for fixed-rate designations; Drivers default to exempt', () => {
  assert.equal(isDriver('Driver'), true);
  assert.equal(resolveCapExempt('Driver', 'fixed', {}), true);
  assert.equal(resolveCapExempt('Naib Qasid', 'fixed', {}), false);
  assert.equal(resolveCapExempt('Naib Qasid', 'fixed', { designationCapExempt: { 'Naib Qasid': true } }), true);
  assert.equal(resolveCapExempt('Cook', 'dynamic', { designationCapExempt: { Cook: true } }), false);
});
