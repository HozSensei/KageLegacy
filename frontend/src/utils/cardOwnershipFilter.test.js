import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cardDefinitionIdsFromDecks,
  slotMatchesOwnershipFilter,
} from './cardOwnershipFilter.js';

const owned = { kind: 'owned', card: { id: 10 } };
const hole = { kind: 'hole', card: { id: 10 } };
const active = new Set([10]);
const any = new Set([10, 20]);

test('slotMatchesOwnershipFilter: empty filter keeps holes and owned', () => {
  assert.equal(slotMatchesOwnershipFilter(owned, '', active, any), true);
  assert.equal(slotMatchesOwnershipFilter(hole, '', active, any), true);
});

test('slotMatchesOwnershipFilter: owned / deck scopes exclude holes', () => {
  assert.equal(slotMatchesOwnershipFilter(hole, 'owned', active, any), false);
  assert.equal(slotMatchesOwnershipFilter(owned, 'owned', active, any), true);
  assert.equal(slotMatchesOwnershipFilter(owned, 'in_active_deck', active, any), true);
  assert.equal(slotMatchesOwnershipFilter(owned, 'not_in_active_deck', active, any), false);
  assert.equal(slotMatchesOwnershipFilter(owned, 'in_any_deck', active, any), true);
  assert.equal(slotMatchesOwnershipFilter(owned, 'not_in_any_deck', active, any), false);
});

test('slotMatchesOwnershipFilter: cards outside decks', () => {
  const lonely = { kind: 'owned', card: { id: 99 } };
  assert.equal(slotMatchesOwnershipFilter(lonely, 'in_active_deck', active, any), false);
  assert.equal(slotMatchesOwnershipFilter(lonely, 'not_in_active_deck', active, any), true);
  assert.equal(slotMatchesOwnershipFilter(lonely, 'in_any_deck', active, any), false);
  assert.equal(slotMatchesOwnershipFilter(lonely, 'not_in_any_deck', active, any), true);
});

test('cardDefinitionIdsFromDecks aggregates active and any decks', () => {
  const decks = [
    {
      isActive: true,
      cards: [{ cardDefinitionId: 1 }, { cardDefinitionId: 2 }],
    },
    {
      isActive: false,
      cards: [{ cardDefinitionId: 2 }, { cardDefinitionId: 3 }],
    },
  ];
  assert.deepEqual([...cardDefinitionIdsFromDecks(decks, { activeOnly: true })].sort(), [1, 2]);
  assert.deepEqual([...cardDefinitionIdsFromDecks(decks)].sort(), [1, 2, 3]);
});
