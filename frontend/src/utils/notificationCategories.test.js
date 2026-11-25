import assert from 'node:assert/strict';
import test from 'node:test';
import {
  gainTitleKeyFromGrants,
  grantTypes,
  notificationCategory,
} from './notificationCategories.js';

test('grantTypes ignores skipped and empty grants', () => {
  assert.deepEqual(
    grantTypes([
      { type: 'xp', amount: 10 },
      { type: 'ryos', amount: 5 },
      { type: 'xp', amount: 2 },
      { skipped: true, type: 'card' },
      null,
    ]),
    ['xp', 'ryos'],
  );
});

test('gainTitleKeyFromGrants maps single reward types', () => {
  assert.equal(
    gainTitleKeyFromGrants([{ type: 'inventory_item', itemKey: 'heal_bandage', amount: 1 }]),
    'notifications.gainItemTitle',
  );
  assert.equal(gainTitleKeyFromGrants([{ type: 'xp', amount: 156 }]), 'notifications.gainXpTitle');
  assert.equal(
    gainTitleKeyFromGrants([{ type: 'ryos', amount: 879 }]),
    'notifications.gainRyosTitle',
  );
  assert.equal(gainTitleKeyFromGrants([{ type: 'card', amount: 1 }]), 'notifications.gainCardTitle');
  assert.equal(
    gainTitleKeyFromGrants([{ type: 'booster', boosterType: 'standard' }]),
    'notifications.gainBoosterTitle',
  );
});

test('gainTitleKeyFromGrants maps XP+Ryos and mixed currency', () => {
  assert.equal(
    gainTitleKeyFromGrants([
      { type: 'xp', amount: 156 },
      { type: 'ryos', amount: 879 },
    ]),
    'notifications.gainXpRyosTitle',
  );
  assert.equal(
    gainTitleKeyFromGrants([
      { type: 'ryos', amount: 10 },
      { type: 'dust', amount: 2 },
    ]),
    'notifications.gainCurrencyTitle',
  );
});

test('gainTitleKeyFromGrants falls back for empty or mixed loot', () => {
  assert.equal(gainTitleKeyFromGrants([]), null);
  assert.equal(
    gainTitleKeyFromGrants([
      { type: 'inventory_item', itemKey: 'heal_bandage', amount: 1 },
      { type: 'card', amount: 1 },
    ]),
    'notifications.gainLootTitle',
  );
  assert.equal(
    gainTitleKeyFromGrants([
      { type: 'xp', amount: 10 },
      { type: 'inventory_item', itemKey: 'heal_bandage', amount: 1 },
    ]),
    'notifications.gainTitle',
  );
});

test('notificationCategory distinguishes gain subtypes for design tokens', () => {
  assert.equal(
    notificationCategory({
      kind: 'gain',
      payload: { source: 'mission', grants: [{ type: 'inventory_item', amount: 1 }] },
    }),
    'item',
  );
  assert.equal(
    notificationCategory({
      kind: 'gain',
      payload: {
        source: 'mission',
        grants: [
          { type: 'xp', amount: 156 },
          { type: 'ryos', amount: 879 },
        ],
      },
    }),
    'currency',
  );
  assert.equal(
    notificationCategory({
      kind: 'quest_ready',
      payload: { questType: 'daily' },
    }),
    'quest',
  );
  assert.equal(
    notificationCategory({
      kind: 'gain',
      payload: { source: 'quest', grants: [{ type: 'xp', amount: 50 }] },
    }),
    'reward',
  );
});
