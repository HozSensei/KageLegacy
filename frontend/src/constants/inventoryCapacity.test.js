/**
 * Smoke : le module shared (source de vérité) reste cohérent.
 * L’alias Vite `@shared` n’est pas résolu par `node --test` — suite complète dans
 * `shared/inventoryCapacity.test.js`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHEST_CAPACITY,
  POUCH_CAPACITY,
  chestSlotsNeededForRewards,
} from '../../../shared/inventoryCapacity.js';

test('capacités inventaire (shared)', () => {
  assert.equal(POUCH_CAPACITY, 4);
  assert.equal(CHEST_CAPACITY, 12);
  assert.equal(chestSlotsNeededForRewards([{ type: 'booster' }]), 1);
  assert.equal(chestSlotsNeededForRewards([{ type: 'card' }]), 0);
});
