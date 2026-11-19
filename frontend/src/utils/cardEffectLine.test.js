import assert from 'node:assert/strict';
import test from 'node:test';
import { activeComboLines } from './cardEffectLine.js';

const i18n = {
  t(key, args) {
    if (key === 'cards.effectComboPrevious') return `${args.art}: ${args.reward}`;
    if (key.startsWith('cards.stats.')) return args;
    return `${key}=${args.n}`;
  },
};

const card = {
  statType: 'taijutsu',
  effects: [
    { type: 'multi_strike', hits: 3 },
    { type: 'combo_previous', statType: 'taijutsu', damage: 1 },
    { type: 'combo_previous', statType: 'genjutsu', damage: 2 },
  ],
};

test('previews only the branch matching the preceding art, without multiplying per-hit bonuses', () => {
  assert.deepEqual(activeComboLines(card, 'genjutsu', i18n), [
    'genjutsu: cards.effectComboDamage=2',
  ]);
  assert.deepEqual(activeComboLines(card, 'taijutsu', i18n), [
    'taijutsu: cards.effectComboDamage=1',
  ]);
  assert.deepEqual(activeComboLines(card, 'ninjutsu', i18n), []);
});

test('does not infer a combo from absent or unsupported turn state', () => {
  for (const art of [null, undefined, 'common']) {
    assert.deepEqual(activeComboLines(card, art, i18n), []);
  }
  assert.deepEqual(activeComboLines({}, 'taijutsu', i18n), []);
});

test('shows the declared nonzero rewards without changing the card cost', () => {
  const skill = {
    cost: 2,
    effects: [
      { type: 'combo_previous', statType: 'medicine', chakra: 1, draw: 0, costReduction: 2 },
      { type: 'combo_previous', statType: 'medicine', damage: 0 },
    ],
  };
  assert.deepEqual(activeComboLines(skill, 'medicine', i18n), [
    'medicine: cards.effectComboChakra=1 · cards.effectNextCostReduction=2',
  ]);
  assert.equal(skill.cost, 2);
});
