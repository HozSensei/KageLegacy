/**
 * Tests du kit médical et du soin dispensaire partagé.
 * Usage: npm run test:bureau-medical-kit
 */

import assert from 'node:assert/strict';
import { assertDispensaryHealEligible } from '../src/services/dispensaryService.js';
import { FORME_UPGRADE } from '../src/services/bureauItemService.js';

function expectError(fn, messagePart) {
  try {
    fn();
    assert.fail('expected error');
  } catch (error) {
    assert.match(error.message, new RegExp(messagePart, 'i'));
    assert.equal(error.statusCode, 400);
  }
}

function testEligibleLamentable() {
  assert.doesNotThrow(() =>
    assertDispensaryHealEligible({ weekly_forme: 'Lamentable', forme_lock_cycles: 0 })
  );
}

function testRejectsNonLamentable() {
  expectError(
    () => assertDispensaryHealEligible({ weekly_forme: 'Passable', forme_lock_cycles: 0 }),
    'Lamentable'
  );
}

function testRejectsGraveInjuryLock() {
  expectError(
    () => assertDispensaryHealEligible({ weekly_forme: 'Lamentable', forme_lock_cycles: 2 }),
    'surveillance médicale'
  );
}

function testMedicalKitIsNotGenericUpgrade() {
  assert.equal(FORME_UPGRADE.Lamentable, 'Passable');
  assert.notEqual(FORME_UPGRADE.Passable, 'Passable');
}

function main() {
  testEligibleLamentable();
  testRejectsNonLamentable();
  testRejectsGraveInjuryLock();
  testMedicalKitIsNotGenericUpgrade();
  console.log('test:bureau-medical-kit OK');
}

main();
