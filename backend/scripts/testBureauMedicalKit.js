/**
 * Tests d'éligibilité des objets de bureau.
 * Usage: npm run test:bureau-medical-kit
 */

import assert from 'node:assert/strict';
import {
  BUREAU_REASON,
  evaluateBureauItemEligibility,
  buildBureauEligibilityMatrix,
} from '../src/services/bureauItemEligibility.js';
import { assertDispensaryHealEligible } from '../src/services/dispensaryService.js';

const lamentableNinja = {
  id: 1,
  grade: 'Genin',
  weekly_forme: 'Lamentable',
  forme_lock_cycles: 0,
  moral: 10,
  taijutsu: 8,
  current_pv_match: 20,
};

function testMedicalKitEligible() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'kit-materiel-medical', isListed: false },
    bureau: { trigger: 'dispensary_heal' },
    ninja: lamentableNinja,
    context: { tacticsLocked: false },
  });
  assert.equal(result.eligible, true);
}

function testMedicalKitRejectsPassable() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'kit-materiel-medical', isListed: false },
    bureau: { trigger: 'dispensary_heal' },
    ninja: { ...lamentableNinja, weekly_forme: 'Passable' },
    context: { tacticsLocked: false },
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.NOT_LAMENTABLE);
}

function testMedicalKitRejectsGraveLock() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'kit-materiel-medical', isListed: false },
    bureau: { trigger: 'dispensary_heal' },
    ninja: { ...lamentableNinja, forme_lock_cycles: 2 },
    context: { tacticsLocked: false },
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.GRAVE_INJURY_LOCK);
}

function testPiluleRejectsDivin() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'pilule-recuperation', isListed: false },
    bureau: { trigger: 'forme_upgrade' },
    ninja: { ...lamentableNinja, weekly_forme: 'Divin', forme_lock_cycles: 0 },
    context: {},
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.FORME_MAX);
}

function testBandageRejectsFullPv() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'bandage-rapide', isListed: false },
    bureau: { trigger: 'pv_heal_pct', percent: 15 },
    ninja: { ...lamentableNinja, taijutsu: 10, current_pv_match: 100 },
    context: {},
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.PV_FULL);
}

function testMoralBoostRejectsMax() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'encens-motivation', isListed: false },
    bureau: { trigger: 'moral_boost', amount: 3 },
    ninja: { ...lamentableNinja, moral: 20 },
    context: {},
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.MORAL_MAX);
}

function testChakraSealBlockedInInventory() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'sceau-chakra', isListed: false },
    bureau: { trigger: 'chakra_seal' },
    context: {},
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.USE_BUREAU_PANEL);
}

function testScoutMapAlreadyConfirmed() {
  const cycle = '2026-07-15T08:00:00.000Z';
  const result = evaluateBureauItemEligibility({
    item: { slug: 'carte-secteur', isListed: false },
    bureau: { trigger: 'scout_map' },
    context: { cycleStartAt: cycle, scoutEnvConfirmedCycle: cycle },
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.SCOUT_ALREADY_CONFIRMED);
}

function testListedItemBlocked() {
  const result = evaluateBureauItemEligibility({
    item: { slug: 'pansement-terrain', isListed: true },
    bureau: { trigger: 'injury_discount', amount: 50 },
    ninja: lamentableNinja,
    context: {},
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reasonCode, BUREAU_REASON.ITEM_LISTED);
}

function testEligibilityMatrixShape() {
  const { ninjas, globalBureauEligibility } = buildBureauEligibilityMatrix({
    items: [
      {
        id: 10,
        category: 'bureau',
        slug: 'kit-materiel-medical',
        isListed: false,
        effects: { bureau: { trigger: 'dispensary_heal' } },
      },
      {
        id: 11,
        category: 'bureau',
        slug: 'carte-secteur',
        isListed: false,
        effects: { bureau: { trigger: 'scout_map' } },
      },
    ],
    ninjas: [lamentableNinja],
    context: { tacticsLocked: false, cycleStartAt: '2026-07-15T08:00:00.000Z' },
  });
  assert.equal(ninjas[0].bureauEligibility[10].eligible, true);
  assert.equal(globalBureauEligibility[11].eligible, true);
}

function testDispensarySharedValidation() {
  assert.doesNotThrow(() =>
    assertDispensaryHealEligible({ weekly_forme: 'Lamentable', forme_lock_cycles: 0 })
  );
}

function main() {
  testMedicalKitEligible();
  testMedicalKitRejectsPassable();
  testMedicalKitRejectsGraveLock();
  testPiluleRejectsDivin();
  testBandageRejectsFullPv();
  testMoralBoostRejectsMax();
  testChakraSealBlockedInInventory();
  testScoutMapAlreadyConfirmed();
  testListedItemBlocked();
  testEligibilityMatrixShape();
  testDispensarySharedValidation();
  console.log('test:bureau-medical-kit OK');
}

main();
