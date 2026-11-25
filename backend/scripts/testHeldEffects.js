import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_CARDS } from './seedCards.js';
import { serializeCardDefinition } from '../src/services/cardService.js';
import { executeEnemyIntent } from '../src/services/combatAIService.js';
import { applyHeldTurnStart, heldEffectMods } from '../src/services/deckCombat/heldEffects.js';
import { applyCardPlay, computeCardDamage } from '../src/services/deckCombat/cardEffects.js';
import { MAX_HAND_SIZE } from '../src/services/deckCombat/constants.js';
import {
  buildRuntimeDeck,
  drawCards,
  moveCardFromHand,
} from '../src/services/deckCombat/deckRuntime.js';
import { applySoloCardBalance } from '../src/services/deckCombat/soloCardBalance.js';

const player = { hp: 50, maxHp: 100, chakra: 5, maxChakra: 5, block: 0, hand: [] };
const enemy = { hp: 100, maxHp: 100, block: 0, intent: { type: 'attack', damage: 10 } };
const rng = () => 0.99;
const play = (card, state, options) =>
  applyCardPlay({ player: { ...player, ...state }, enemy, card, stats: {}, rng, ...options });

// A row in the format read by deckService, populated from the actual catalogue.
function catalogueRow(card, heldJson = JSON.stringify(card.heldEffect)) {
  return {
    id: card.slug,
    slug: card.slug,
    name_fr: card.nameFr,
    name_en: card.nameEn,
    type: card.type,
    stat_type: card.statType,
    element: card.element,
    base_cost: card.baseCost,
    base_damage: card.baseDamage,
    base_block: card.baseBlock,
    base_heal: card.baseHeal,
    effects_json: JSON.stringify(card.effects),
    held_effect_json: heldJson,
    description_fr: card.descriptionFr,
    description_en: card.descriptionEn,
    upgrade_bonuses_json: JSON.stringify(card.upgradeBonuses),
  };
}

const catalogue = Object.fromEntries(
  ALL_CARDS.filter(card => card.heldEffect).map(card => [card.slug, card])
);
const heritage = (clan, quantity = 1) => {
  const card = serializeCardDefinition(catalogueRow(catalogue[`clan-${clan}`]));
  return buildRuntimeDeck([{ card: applySoloCardBalance(card), quantity }]);
};

const promises = {
  'clan-shizumori': [{ type: 'evade_percent', value: 15 }, '+15 % esquive.', '+15% evade.'],
  'clan-benigiri': [
    { type: 'art_damage_percent', statType: 'ninjutsu', value: 20 },
    '+20 % dégâts Ninjutsu.',
    '+20% Ninjutsu damage.',
  ],
  'clan-kazamine': [
    { type: 'art_damage_percent', statType: 'taijutsu', value: 20 },
    '+20 % dégâts Taijutsu.',
    '+20% Taijutsu damage.',
  ],
  'clan-kumatani': [
    { type: 'starting_block', value: 6 },
    '+6 armure au début du tour.',
    '+6 block at turn start.',
  ],
  'clan-yukisawa': [
    { type: 'gain_chakra', value: 2 },
    '+2 Chakra au début du tour.',
    '+2 Chakra at turn start.',
  ],
  'clan-nagihara': [{ type: 'heal_percent', value: 20 }, '+20 % soins.', '+20% healing.'],
};

test('all catalogue held effects and their FR/EN descriptions reach the solo runtime', () => {
  assert.deepEqual(Object.keys(catalogue).sort(), Object.keys(promises).sort());
  for (const [slug, [effect, fr, en]] of Object.entries(promises)) {
    const source = catalogue[slug];
    // JSON may be returned by the driver as a string or an already decoded object.
    const serialized = serializeCardDefinition(catalogueRow(source, source.heldEffect));
    const upgraded = serializeCardDefinition(catalogueRow(source), { upgradeLevel: 2 });
    const [card] = heritage(slug.slice('clan-'.length));
    assert.deepEqual(serialized.heldEffect, effect, slug);
    assert.deepEqual(
      buildRuntimeDeck([applySoloCardBalance(upgraded)])[0].heldEffect,
      effect,
      slug
    );
    assert.deepEqual(card.heldEffect, effect, slug);
    assert.equal(card.statType, 'common', slug);
    assert.ok(card.descriptionFr.endsWith(`En main : ${fr}`), slug);
    assert.ok(card.descriptionEn.endsWith(`In hand: ${en}`), slug);
  }
  const ordinary = serializeCardDefinition({
    ...catalogueRow(catalogue['clan-nagihara']),
    held_effect_json: null,
  });
  assert.equal(buildRuntimeDeck([ordinary])[0].heldEffect, null);
});

test('turn-start Chakra and block: opening draw, hand only, and distinct instances', () => {
  const [chakra, secondCopy] = heritage('yukisawa', 2);
  const [block] = heritage('kumatani');
  const opening = drawCards({ ...player, drawPile: [chakra] }, 1, rng).player;
  const state = {
    ...opening,
    hand: [...(opening.hand || []), block],
    // Legacy reserve fields must not grant held effects.
    reserveCard: { ...block, instanceId: 'legacy-reserve' },
    reservedCard: { ...block, instanceId: 'legacy-reserved' },
    discardPile: [secondCopy],
    exhaustPile: [secondCopy],
  };
  const granted = applyHeldTurnStart(state);
  assert.equal(granted.player.chakra, 7); // Can exceed the base refill.
  assert.equal(granted.player.block, 6);
  assert.deepEqual(granted.logs, [
    { type: 'held_gain_chakra', amount: 2, chakra: 7, card: chakra.slug },
    { type: 'held_gain_block', amount: 6, block: 6, card: block.slug },
  ]);
  assert.equal(state.chakra, 5);
  assert.equal(state.block, 0);
  assert.equal(applyHeldTurnStart({ ...state, hand: [chakra, secondCopy] }).player.chakra, 9);
  const discarded = moveCardFromHand(state, chakra.instanceId).player;
  assert.equal(applyHeldTurnStart(discarded).player.chakra, 5);
  assert.equal(applyHeldTurnStart({ ...player, reserveCard: chakra }).player.chakra, 5);
});

test('held evade affects both the solo enemy and its minion, but not from a pile or reserve', () => {
  const [shizumori] = heritage('shizumori');
  const attacker = { ...enemy, minion: { hp: 20, attack: 3 } };
  const holder = { ...player, hand: [shizumori] };
  const dodged = executeEnemyIntent(attacker, holder, () => 0.149);
  assert.equal(dodged.player.hp, 50);
  assert.deepEqual(
    dodged.logs.filter(log => log.type === 'evade').map(log => log.reason),
    ['minion', undefined]
  );
  assert.equal(executeEnemyIntent(attacker, holder, () => 0.15).player.hp, 37);
  assert.equal(
    executeEnemyIntent(attacker, { ...player, drawPile: [shizumori] }, () => 0).player.hp,
    37
  );
  assert.equal(
    executeEnemyIntent(attacker, { ...player, reserveCard: shizumori }, () => 0).player.hp,
    37
  );
  assert.equal(heldEffectMods({ hand: heritage('shizumori', 6) }).evadeChance, 0.75);
});

test('art damage only boosts matching attacks and applies per hit', () => {
  const [nin] = heritage('benigiri');
  const [tai] = heritage('kazamine');
  const state = { hand: [nin, tai] };
  for (const [statType, expected] of [
    ['ninjutsu', 24],
    ['taijutsu', 24],
    ['genjutsu', 20],
    ['common', 20],
  ]) {
    const card = { statType, damage: 10, effects: [{ type: 'multi_strike', hits: 2 }] };
    assert.equal(play(card, state).enemy.hp, enemy.hp - expected, statType);
  }
  assert.equal(
    play(
      { statType: 'taijutsu', damage: 10, effects: [{ type: 'multi_strike', hits: 2 }] },
      { hand: [nin], reservedCard: tai }
    ).enemy.hp,
    enemy.hp - 20
  );
});

test('the instance being played cannot boost itself', () => {
  const [first, second] = heritage('nagihara', 2);
  const card = { ...first, heal: 10 };
  const state = { hand: [first] };
  assert.equal(play(card, state).player.hp, 60);
  assert.equal(play(card, { ...state, hand: [first, second] }).player.hp, 62);

  const [attack] = heritage('benigiri');
  const matchingAttack = { ...attack, statType: 'ninjutsu', damage: 10 };
  assert.equal(
    computeCardDamage(matchingAttack, { player: { hand: [matchingAttack] }, rng }).total,
    10
  );
});

test('healing reads the current hand, including heritage drawn by an earlier effect', () => {
  const [nagihara] = heritage('nagihara');
  const card = {
    heal: 10,
    effects: [
      { type: 'draw', value: 1 },
      { type: 'heal_self', value: 10 },
    ],
  };
  const result = play(card, { drawPile: [nagihara] });
  assert.deepEqual(
    result.logs.filter(log => log.type === 'heal').map(log => log.amount),
    [10, 12]
  );
  assert.equal(play(card, { discardPile: [nagihara] }).player.hp, 72); // Recycled by the draw.
  assert.equal(
    play({ ...card, effects: card.effects.slice(1) }, { discardPile: [nagihara] }).player.hp,
    70
  );
});

test('held healing boosts the same amount for direct and effect heals, including flat healing', () => {
  const [nagihara] = heritage('nagihara');
  const state = { hand: [nagihara] };
  const options = { talentMods: { healFlat: 5 } };
  assert.equal(play({ heal: 10 }, state, options).player.hp, 68);
  assert.equal(play({ effects: [{ type: 'heal_self', value: 10 }] }, state, options).player.hp, 68);
  const combo = { heal: 5, effects: [{ type: 'combo_previous', statType: 'medicine', heal: 5 }] };
  const comboState = { ...state, previousCardStatType: 'medicine' };
  assert.equal(play(combo, comboState).player.hp, 62);
  const capped = play({ heal: 10 }, { ...state, hp: 95 });
  assert.equal(capped.player.hp, 100);
  assert.equal(capped.logs.find(log => log.type === 'heal').amount, 5);
  assert.equal(play({ heal: 10 }, { reserveCard: nagihara }, options).player.hp, 65);
});

test('playing a heritage at the hand cap frees one slot for its own draw', () => {
  const [shizumori] = heritage('shizumori');
  const [drawn, overflow] = heritage('nagihara', 2);
  const hand = [
    shizumori,
    ...Array.from({ length: MAX_HAND_SIZE - 1 }, (_, i) => ({ instanceId: `filler-${i}` })),
  ];
  const result = play(shizumori, { hand, drawPile: [drawn, overflow] });
  const moved = moveCardFromHand(result.player, shizumori.instanceId);
  assert.equal(moved.card, shizumori);
  assert.equal(moved.player.hand.length, MAX_HAND_SIZE);
  assert.equal(moved.player.hand.at(-1), drawn);
  assert.deepEqual(moved.player.discardPile, [overflow, shizumori]);
  assert.equal(heldEffectMods(moved.player).evadeChance, 0);
  assert.equal(heldEffectMods(moved.player).healPct, 0.2);
  assert.equal(hand.length, MAX_HAND_SIZE);
});

test('held Chakra applies at turn start via applyHeldTurnStart', () => {
  const [chakra] = heritage('yukisawa');
  const withHeld = applyHeldTurnStart({ ...player, hand: [chakra], chakra: 5 });
  const without = applyHeldTurnStart({ ...player, chakra: 5 });
  assert.equal(withHeld.player.chakra, 7);
  assert.equal(without.player.chakra, 5);
});
