import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createI18n } from 'vue-i18n';
import { activeComboLines, cardEffectParts, formatStructuredEffect } from './cardEffectLine.js';

const i18n = {
  t(key, args) {
    if (key === 'cards.effectComboPreviousSame') return `same: ${args.reward}`;
    if (key === 'cards.effectComboPreviousOther') return `${args.art}: ${args.reward}`;
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
    'same: cards.effectComboDamage=1',
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

function translations(locale) {
  const messages = JSON.parse(readFileSync(new URL(`../locales/${locale}.json`, import.meta.url)));
  return createI18n({ legacy: false, locale, messages: { [locale]: messages } }).global;
}

for (const [locale, expected] of Object.entries({
  fr: [
    '+3 dégâts si la cible est vulnérable',
    '+3 dégâts si la cible est affaiblie',
    '+3 dégâts en première carte du tour',
    '+3 dégâts après une carte de Taijutsu',
  ],
  en: [
    '+3 damage if the target is Vulnerable',
    '+3 damage if the target is Weak',
    '+3 damage as the first card of the turn',
    '+3 damage after a Taijutsu card',
  ],
})) {
  test(`formats all supported conditional damage effects in ${locale}`, () => {
    const effects = [
      { condition: 'enemy_vulnerable' },
      { condition: 'enemy_weak' },
      { condition: 'first_card' },
      { condition: 'previous_card_stat_type', statType: 'taijutsu' },
    ].map(effect => ({ ...effect, type: 'bonus_if', value: 3 }));
    const i18n = translations(locale);
    assert.deepEqual(
      effects.map(effect => formatStructuredEffect(effect, i18n)),
      expected
    );
  });
}

test('ignores unsupported conditions and missing, zero or invalid conditional damage values', () => {
  const i18n = translations('en');
  const bonus = { type: 'bonus_if', condition: 'enemy_vulnerable', value: 3 };
  const unsupported = [
    { ...bonus, condition: 'unknown' },
    { ...bonus, condition: 'previous_card_stat_type' },
    { ...bonus, condition: 'previous_card_stat_type', statType: 'common' },
    ...[undefined, null, 0, 'invalid', Infinity].map(value => ({ ...bonus, value })),
  ];
  for (const effect of unsupported) assert.equal(formatStructuredEffect(effect, i18n), null);
});

for (const [locale, expected] of Object.entries({
  fr: ['+3 dégâts si la cible est vulnérable', 'Riposte 8', '+1 Faiblesse (2 t)', 'Frappe ×3'],
  en: ['+3 damage if the target is Vulnerable', 'Counter 8', '+1 Weak (2t)', 'Strike ×3'],
})) {
  test(`uses resolved, structured effects even without descriptions in ${locale}`, () => {
    const balancedCard = {
      damage: 7,
      baseDamage: 4,
      descriptionFr: null,
      descriptionEn: null,
      effects: [
        { type: 'bonus_if', condition: 'enemy_vulnerable', value: 3 },
        { type: 'counter', damage: 8 },
        { type: 'apply_status', status: 'weak', value: 1, duration: 2 },
        { type: 'multi_strike', hits: 3 },
      ],
    };
    const { texts, aria, figures } = cardEffectParts(balancedCard, null, translations(locale));
    assert.deepEqual(
      texts.map(entry => entry.text),
      expected
    );
    assert.deepEqual(aria.slice(1), expected);
    assert.equal(figures.length, 1);
    assert.equal(figures[0].base, balancedCard.damage);
  });
}

test('shortens combo copy when the required art matches the card art', () => {
  const i18n = translations('fr');
  const same = formatStructuredEffect(
    { type: 'combo_previous', statType: 'genjutsu', damage: 2 },
    { ...i18n, card: { statType: 'genjutsu' } }
  );
  const other = formatStructuredEffect(
    { type: 'combo_previous', statType: 'genjutsu', damage: 2 },
    { ...i18n, card: { statType: 'ninjutsu' } }
  );
  assert.equal(same, 'Enchaînement : 2 dégâts');
  assert.equal(other, 'Après Genjutsu : 2 dégâts');
});

test('marks matching combo lines as active for combat highlighting', () => {
  const i18n = translations('fr');
  const { texts } = cardEffectParts(card, null, i18n, { previousCardStatType: 'genjutsu' });
  const comboLines = texts.filter(entry => entry.kind === 'combo');
  assert.equal(comboLines.length, 2);
  assert.equal(comboLines.find(entry => entry.art === 'genjutsu')?.active, true);
  assert.equal(comboLines.find(entry => entry.art === 'taijutsu')?.active, false);
});

test('surfaces summon creature stats on the card face', () => {
  const i18n = translations('fr');
  const summonCard = {
    type: 'summon',
    summon: { hp: 20, attack: 6, duration: 2, abilities: ['taunt'] },
    effects: [],
  };
  const { texts } = cardEffectParts(summonCard, null, i18n);
  assert.deepEqual(
    texts.map(entry => entry.text),
    ['20 PV', '6 ATK', '2 tours', 'Provocation']
  );
});
