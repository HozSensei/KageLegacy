import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHEST_BASE_PAGES,
  CHEST_CAPACITY,
  CHEST_PAGE_SIZE,
  POUCH_CAPACITY,
  emptySlotCount,
  getChestCapacity,
} from './inventoryCapacity.js';

test('poche : 4 slots (alignée inventaire de mission)', () => {
  assert.equal(POUCH_CAPACITY, 4);
});

test('coffre : 1 page de 12 slots', () => {
  assert.equal(CHEST_PAGE_SIZE, 12);
  assert.equal(CHEST_BASE_PAGES, 1);
  assert.equal(CHEST_CAPACITY, 12);
  assert.equal(getChestCapacity(), 12);
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
