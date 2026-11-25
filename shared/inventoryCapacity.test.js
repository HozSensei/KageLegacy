import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHEST_BASE_PAGES,
  CHEST_CAPACITY,
  CHEST_PAGE_SIZE,
  POUCH_CAPACITY,
  capacityFor,
  chestSlotsNeededForRewards,
  countsTowardPouchCapacity,
  emptySlotCount,
  getChestCapacity,
  pouchCapacityUsed,
} from './inventoryCapacity.js';

test('poche : 4 slots (1 objet = 1 slot)', () => {
  assert.equal(POUCH_CAPACITY, 4);
  assert.equal(capacityFor('pouch'), 4);
});

test('coffre : 1 page de 12 slots', () => {
  assert.equal(CHEST_PAGE_SIZE, 12);
  assert.equal(CHEST_BASE_PAGES, 1);
  assert.equal(CHEST_CAPACITY, 12);
  assert.equal(getChestCapacity(), 12);
  assert.equal(capacityFor('chest'), 12);
});

test('coffre extensible par pages', () => {
  assert.equal(getChestCapacity({ pages: 2 }), 24);
  assert.equal(getChestCapacity({ pages: 0 }), 12);
});

test('slots vides : ne masque pas un surplus legacy', () => {
  assert.equal(emptySlotCount(0, 4), 4);
  assert.equal(emptySlotCount(2, 4), 2);
  assert.equal(emptySlotCount(4, 4), 0);
  assert.equal(emptySlotCount(6, 4), 0);
});

test('chestSlotsNeededForRewards : booster/objet vs carte/monnaie', () => {
  assert.equal(chestSlotsNeededForRewards([{ type: 'ryos', amount: 100 }]), 0);
  assert.equal(chestSlotsNeededForRewards([{ type: 'card', rarity: 'rare' }]), 0);
  assert.equal(chestSlotsNeededForRewards([{ type: 'booster', boosterType: 'standard' }]), 1);
  assert.equal(
    chestSlotsNeededForRewards([
      { type: 'booster', boosterType: 'premium' },
      { type: 'ryos', amount: 50 },
      { type: 'inventory_item', amount: 2 },
    ]),
    3,
  );
});

test('scellés hors capacité poche', () => {
  assert.equal(countsTowardPouchCapacity('pending_card'), false);
  assert.equal(countsTowardPouchCapacity({ kind: 'pending_card' }), false);
  assert.equal(countsTowardPouchCapacity({ kind: 'consumable' }), true);
  assert.equal(countsTowardPouchCapacity({ kind: 'booster' }), true);
  assert.equal(
    pouchCapacityUsed([
      { kind: 'pending_card' },
      { kind: 'pending_card' },
      { kind: 'consumable' },
      { kind: 'consumable' },
    ]),
    2,
  );
});
