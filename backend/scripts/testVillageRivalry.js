/**
 * Smoke test villages C0 (paires + actions).
 * Usage: node scripts/testVillageRivalry.js
 */
import assert from 'node:assert/strict';
import {
  pickRivalryPair,
  VILLAGE_ACTIONS,
  VILLAGE_IDS,
  isValidVillageId,
} from '../src/services/villageService.js';

assert.equal(VILLAGE_IDS.length, 4);
assert.ok(isValidVillageId('leaf'));
assert.equal(isValidVillageId('cloud'), false);

const pair = pickRivalryPair(1);
assert.ok(VILLAGE_IDS.includes(pair.village_a));
assert.ok(VILLAGE_IDS.includes(pair.village_b));
assert.notEqual(pair.village_a, pair.village_b);

assert.equal(VILLAGE_ACTIONS.daily_seal, 1);
assert.equal(VILLAGE_ACTIONS.bird_flight_success, 8);

console.log('test:village-rivalry OK');
