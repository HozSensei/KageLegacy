import assert from 'node:assert/strict';
import test from 'node:test';
import { isSealedScroll, shopItemEffect, shopItemName } from './missionShopItems.js';

const fr = {
  t: (key, fallback) => {
    const map = {
      'combat.inventoryEmpty': 'Vide',
      'combat.shopItems.heal_bandage': 'Bandage',
      'combat.shopItemEffects.heal_bandage': 'Soigne 25 % des PV max (hors combat).',
    };
    return map[key] ?? fallback ?? key;
  },
  locale: 'fr',
};

test('shopItemName préfère nameFr puis i18n', () => {
  assert.equal(shopItemName(null, fr), 'Vide');
  assert.equal(shopItemName('heal_bandage', fr), 'Bandage');
  assert.equal(
    shopItemName({ id: 'heal_bandage', nameFr: 'Bandage custom' }, fr),
    'Bandage custom'
  );
});

test('shopItemEffect préfère descriptionFr puis i18n', () => {
  assert.equal(shopItemEffect(null, fr), '');
  assert.equal(shopItemEffect('heal_bandage', fr), 'Soigne 25 % des PV max (hors combat).');
  assert.equal(
    shopItemEffect(
      { id: 'heal_bandage', descriptionFr: 'Soigne bien.' },
      fr
    ),
    'Soigne bien.'
  );
  assert.equal(shopItemEffect({ itemId: 'heal_bandage' }, fr), 'Soigne 25 % des PV max (hors combat).');
});

test('isSealedScroll detects pending_card / catalog ids', () => {
  assert.equal(isSealedScroll('card_mystery_legendary'), true);
  assert.equal(isSealedScroll({ itemId: 'card_mystery_rare' }), true);
  assert.equal(isSealedScroll({ kind: 'pending_card', id: 'x' }), true);
  assert.equal(isSealedScroll('heal_bandage'), false);
  assert.equal(isSealedScroll(null), false);
});
