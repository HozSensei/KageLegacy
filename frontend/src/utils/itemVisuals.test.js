import assert from 'node:assert/strict';
import test from 'node:test';
import { itemCategory, itemVisual } from './itemVisuals.js';

test('itemCategory : soins / dégâts / utilitaire / scellé', () => {
  assert.equal(itemCategory('heal_bandage'), 'heal');
  assert.equal(itemCategory({ itemKey: 'heal_tonic', kind: 'consumable' }), 'heal');
  assert.equal(
    itemCategory({ id: 'x', effect: { type: 'heal_percent', value: 0.5 } }),
    'heal'
  );

  assert.equal(itemCategory('run_boost_damage'), 'damage');
  assert.equal(itemCategory('next_damage'), 'damage');
  assert.equal(
    itemCategory({ effect: { type: 'next_combat_damage_pct', value: 15 } }),
    'damage'
  );

  assert.equal(itemCategory('run_purse_charm'), 'utility');
  assert.equal(itemCategory({ itemId: 'next_chakra' }), 'utility');
  assert.equal(
    itemCategory({ effect: { type: 'run_purse_mult', value: 1.25 } }),
    'utility'
  );

  assert.equal(itemCategory('card_mystery_rare'), 'sealed');
  assert.equal(itemCategory({ kind: 'booster', itemKey: 'booster_standard' }), 'sealed');
  assert.equal(itemCategory({ kind: 'pending_card', id: 'custom' }), 'sealed');
});

test('itemCategory : vide / ton et icône', () => {
  assert.equal(itemCategory(null), 'empty');
  assert.equal(itemCategory({ slot: 0, itemId: null }), 'empty');

  assert.deepEqual(itemVisual('heal_bandage'), {
    id: 'heal',
    tone: 'leaf',
    icon: 'regen',
  });
  assert.deepEqual(itemVisual('run_boost_damage'), {
    id: 'damage',
    tone: 'vermilion',
    icon: 'attack',
  });
  assert.deepEqual(itemVisual('run_purse_charm'), {
    id: 'utility',
    tone: 'sky',
    icon: 'special',
  });
  assert.deepEqual(itemVisual('booster_premium'), {
    id: 'sealed',
    tone: 'gold',
    icon: 'journal',
  });
  assert.equal(itemVisual(null).tone, 'neutral');
});
