import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCoopAction,
  createCoopCombat,
  publicCoopCombat,
} from '../src/services/deckCombat/coopCombat.js';

const card = (slug, props = {}) => ({
  slug,
  statType: 'medicine',
  type: 'skill',
  cost: 1,
  ...props,
});
const copies = (card, quantity) => ({ card, quantity });
const filler = copies(card('filler'), 6);
const fighters = (deck1 = [filler], deck2 = [filler]) => [
  { id: 'a', name: 'Akari', stats: {}, deckEntries: deck1 },
  { id: 'b', name: 'Bunta', stats: {}, deckEntries: deck2 },
];
const view = (combat, id = 'a') => publicCoopCombat(combat, id);
const end = (combat, id = combat.activePlayerId) =>
  applyCoopAction(combat, id, { type: 'end_turn' });
const instance = (combat, id, slug) =>
  view(combat, id).player.hand.find(c => !slug || c.slug === slug).instanceId;
const play = (combat, id, slug, target = 'enemy', confirmation) =>
  applyCoopAction(combat, id, {
    type: 'play',
    instanceId: instance(combat, id, slug),
    target,
    confirmedFriendlyFire: confirmation,
  });
const exchange = (combat, id, type, instanceId = instance(combat, id)) =>
  applyCoopAction(combat, id, { type, instanceId });
const status = statusCode => ({ statusCode });

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

test('ouvre deux mains privées, applique les bonus par copie et attend le tour pour les effets tenus', () => {
  const roster = fighters(
    [
      copies(card('secret-a', { passiveBonus: { maxChakra: 1, maxHp: 5, medicine: 2 } }), 2),
      copies(card('filler-a'), 3),
    ],
    [copies(card('secret-b', { heldEffect: { type: 'gain_chakra', value: 1 } }), 5)]
  );
  roster[0].stats = { medicine: 10, maxChakra: 1 };
  roster[0].talentCodes = ['iron_guard'];
  const start = createCoopCombat(deepFreeze(roster));
  assert.deepEqual(start, createCoopCombat(roster));
  const akari = view(start);
  const bunta = view(start, 'b');
  assert.equal(akari.player.hand.length, 5);
  assert.equal(bunta.player.hand.length, 5);
  assert.equal(akari.player.chakra, 8);
  assert.equal(akari.stats.medicine, 14);
  assert.equal(akari.player.hp, 110);
  assert.equal(akari.player.block, 3);
  assert.equal(bunta.player.chakra, 5);
  assert.deepEqual(akari.ally, {
    id: 'b',
    name: 'Bunta',
    hp: 100,
    maxHp: 100,
    block: 0,
    chakra: 5,
    maxChakra: 5,
    statuses: [],
  });
  assert.equal(akari.ruleset, 'persistent');
  assert.equal(akari.currentPhase, 'player_turn');
  assert.equal(bunta.currentPhase, 'enemy_turn');
  assert.equal(akari.activePlayerId, 'a');
  assert.equal(akari.rewards, null);
  assert.equal(akari.suppressRewards, true);
  assert.doesNotMatch(JSON.stringify(akari), /secret-b|rngState|drawPile|p2-/);
  akari.player.hand.length = 0;
  assert.equal(view(start).player.hand.length, 5);
  const second = end(start);
  assert.equal(view(second, 'b').player.chakra, 10);
  assert.doesNotMatch(JSON.stringify(view(second)), /secret-b|held_gain_chakra/);
});

test('enchaîne J1 → J2 → ennemi avec les intentions ciblées et protège même avant le tour du bénéficiaire', () => {
  const guard = card('guard', { block: 10 });
  let combat = createCoopCombat(fighters([guard], [guard]));
  const opening = view(combat).enemy;
  assert.deepEqual([opening.intent.targetId, opening.intent.targetName], ['a', 'Akari']);
  assert.deepEqual([opening.nextIntent.targetId, opening.nextIntent.targetName], ['b', 'Bunta']);
  combat = play(combat, 'a', 'guard', 'ally');
  assert.equal(view(combat).ally.block, 10);
  assert.equal(view(combat).player.block, 0);
  combat = end(combat);
  assert.equal(view(combat, 'b').player.block, 10);
  assert.equal(combat.currentTurn, 1);
  assert.deepEqual(view(combat).enemy.intent, opening.intent);
  assert.equal(view(combat).player.hp, 100);
  combat = play(combat, 'b', 'guard', 'ally');
  combat = end(combat);
  assert.equal(combat.currentTurn, 2);
  assert.equal(combat.activePlayerId, 'a');
  assert.equal(view(combat).player.hp, 100 - (opening.intent.displayDamage - 10));
  assert.equal(view(combat, 'b').player.block, 0);
  assert.deepEqual(view(combat).enemy.intent, opening.nextIntent);
  assert.ok(
    view(combat).logs.some(l => l.type === 'damage' && l.source === 'enemy' && l.targetId === 'a')
  );
  const secondRound = end(end(combat));
  assert.equal(view(secondRound, 'b').player.hp, 100 - opening.nextIntent.displayDamage);
});

test('garde les cartes non jouées, échange deux fois par joueur et remet quota/chakra à zéro à son tour', () => {
  const start = deepFreeze(createCoopCombat(fighters()));
  const firstCard = instance(start, 'a');
  let combat = exchange(start, 'a', 'discard_chakra');
  assert.equal(view(combat).player.chakra, 6);
  assert.equal(view(combat).player.discardsRemaining, 1);
  assert.equal(view(combat).player.chakraDiscardAvailable, false);
  assert.throws(() => exchange(combat, 'a', 'discard_chakra'), status(400));
  const secondCard = instance(combat, 'a');
  combat = exchange(combat, 'a', 'discard_draw');
  const retained = view(combat).player.hand.map(c => c.instanceId);
  assert.equal(retained.length, 4);
  assert.ok(!retained.includes(firstCard) && !retained.includes(secondCard));
  assert.throws(() => exchange(combat, 'a', 'discard_draw'), status(400));
  combat = end(combat);
  assert.equal(view(combat, 'b').player.discardsRemaining, 2);
  combat = exchange(combat, 'b', 'discard_draw');
  combat = exchange(combat, 'b', 'discard_draw');
  assert.equal(view(combat, 'b').player.discardsRemaining, 0);
  combat = end(combat);
  assert.equal(view(combat).player.chakra, 5);
  assert.equal(view(combat).player.discardsRemaining, 2);
  assert.equal(view(combat).player.hand.length, 5);
  assert.deepEqual(
    view(combat)
      .player.hand.slice(0, 4)
      .map(c => c.instanceId),
    retained
  );
  assert.equal(view(start).player.hand.length, 5);
});

test('refuse un échange sans autre carte et ne réduit pas une main au-dessus de cinq', () => {
  const single = deepFreeze(createCoopCombat(fighters([card('unique')])));
  assert.throws(() => exchange(single, 'a', 'discard_draw'), status(400));
  assert.equal(view(single).player.discardsRemaining, 2);
  const grow = copies(card('grow', { effects: [{ type: 'draw', value: 2 }] }), 9);
  let combat = createCoopCombat(fighters([grow]));
  combat = play(combat, 'a', 'grow');
  const hand = view(combat).player.hand;
  assert.equal(hand.length, 6);
  combat = end(end(combat));
  assert.deepEqual(view(combat).player.hand, hand);
});

test('le support redirige soin, bloc et purification sans les appliquer au lanceur ni à l’ennemi', () => {
  const salve = card('salve', {
    heal: 4,
    block: 3,
    exhaust: true,
    effects: [
      { type: 'heal_self', value: 4 },
      { type: 'gain_block', value: 2 },
      { type: 'cleanse_self' },
      { type: 'draw', value: 1 },
    ],
  });
  const roster = fighters([card('guard', { block: 1 })], [copies(salve, 6)]);
  roster[1].stats = { medicine: 25 };
  const initial = end(end(createCoopCombat(roster)));
  const poisoned = { key: 'poison', value: 2, duration: 2 };
  const weak = { key: 'weak', value: 1, duration: 2 };
  const combat = deepFreeze({
    ...initial,
    players: [
      { ...initial.players[0], statuses: [poisoned] },
      { ...initial.players[1], hp: 85, statuses: [weak], block: 1 },
    ],
  });
  const active = end(combat);
  const next = play(active, 'b', 'salve', 'ally');
  assert.equal(view(next).player.hp, view(active).player.hp + 10);
  assert.equal(view(next).player.block, 7);
  assert.deepEqual(view(next).player.statuses, []);
  assert.deepEqual(view(next, 'b').player.statuses, [weak]);
  assert.equal(view(next, 'b').player.hp, 85);
  assert.equal(view(next, 'b').player.block, 1);
  assert.equal(view(next, 'b').player.chakra, 4);
  assert.equal(view(next, 'b').player.exhaustCount, 1);
  assert.equal(view(next, 'b').player.hand.length, 5);
  assert.deepEqual(next.enemy, active.enemy);
  assert.ok(view(next).logs.some(l => l.type === 'cleanse' && l.targetId === 'a'));
  assert.doesNotMatch(JSON.stringify(view(next)), /salve|p2-/);
  assert.doesNotMatch(JSON.stringify(view(next).logs), /instanceId|"type":"draw"/);
});

test('tir allié : exige le booléen true, passe par le bloc et applique les dégâts/statuts une seule fois', () => {
  const strike = card('secret-strike', {
    statType: 'ninjutsu',
    damage: 6,
    effects: [
      { type: 'multi_strike', hits: 2 },
      { type: 'apply_status', target: 'enemy', status: 'burn', duration: 2 },
    ],
  });
  const roster = fighters([strike]);
  roster[1].stats = { startingBlock: 3 };
  const start = deepFreeze(createCoopCombat(roster));
  for (const confirmation of [undefined, false, 'true', 1]) {
    assert.throws(
      () => play(start, 'a', 'secret-strike', 'ally', confirmation),
      /Tir allié à confirmer/
    );
  }
  assert.equal(view(start).player.chakra, 5);
  const result = play(start, 'a', 'secret-strike', 'ally', true);
  assert.deepEqual(result, play(start, 'a', 'secret-strike', 'ally', true));
  assert.equal(view(result).ally.hp, 91);
  assert.equal(view(result).ally.block, 0);
  assert.equal(view(result).player.chakra, 4);
  assert.equal(view(result).player.hand.length, 0);
  assert.deepEqual(view(result, 'b').player.statuses, [{ key: 'burn', value: 5, duration: 2 }]);
  assert.deepEqual(view(result).ally.statuses, [{ key: 'burn', value: 5, duration: 2 }]);
  assert.equal(view(result, 'b').ally.chakra, 4);
  assert.equal('hand' in view(result, 'b').ally, false);
  assert.deepEqual(result.enemy, start.enemy);
  assert.equal(
    view(result, 'b').logs.filter(l => l.type === 'damage' && l.targetId === 'b').length,
    1
  );
  assert.doesNotMatch(JSON.stringify(view(result, 'b')), /secret-strike|p1-/);
});

test('un malus sans dégâts de base exige aussi confirmation ; les combinaisons ambiguës sont refusées', () => {
  const hex = card('hex', {
    statType: 'ninjutsu',
    effects: [{ type: 'apply_status', status: 'brûlure', duration: 2 }],
  });
  const mixed = card('mixed', { damage: 4, heal: 4 });
  const seal = card('seal', { effects: [{ type: 'seal_intent' }] });
  const unexplained = card('unknown', { heal: 2, effects: [{ type: 'damage', value: 10 }] });
  const start = deepFreeze(createCoopCombat(fighters([hex, mixed, seal, unexplained])));
  assert.throws(() => play(start, 'a', 'hex', 'ally'), /Tir allié à confirmer/);
  const combat = play(start, 'a', 'hex', 'ally', true);
  assert.equal(view(combat).ally.hp, 100);
  assert.deepEqual(view(combat, 'b').player.statuses, [{ key: 'burn', value: 5, duration: 2 }]);
  for (const slug of ['mixed', 'seal', 'unknown']) {
    assert.throws(() => play(start, 'a', slug, 'ally', true), /Combinaison non prise en charge/);
  }
  assert.deepEqual(view(start).player.statuses, []);
  assert.equal(view(start).player.chakra, 5);
  assert.equal(view(start).player.hand.length, 4);
  const sealed = play(start, 'a', 'seal');
  assert.equal(view(sealed).enemy.intent.type, 'sealed');
  assert.equal(view(sealed).enemy.intent.targetId, 'a');
  assert.equal(view(end(end(sealed))).player.hp, 100);
});

test('saute un K.-O., recible le survivant et termine quand toute l’équipe est à terre', () => {
  const roster = fighters([card('knockout', { damage: 100 })]);
  roster[0].stats = { maxHp: -75 };
  let combat = createCoopCombat(roster);
  combat = play(combat, 'a', 'knockout', 'ally', true);
  assert.equal(view(combat).ally.hp, 0);
  assert.equal(view(combat).state, 'in_progress');
  assert.equal(view(combat).enemy.nextIntent.targetId, 'a');
  assert.throws(() => end(combat, 'b'), status(400));
  combat = end(combat);
  assert.equal(combat.activePlayerId, 'a');
  assert.equal(combat.currentTurn, 2);
  assert.equal(view(combat).player.hp, 3);
  combat = end(combat);
  assert.equal(view(combat).state, 'defeat');
  assert.equal(view(combat).currentPhase, 'game_over');
  assert.equal(combat.activePlayerId, null);
});

test('valide participants, tours, cartes, cibles et chakra ; termine sur victoire ou abandon', () => {
  const roster = fighters([card('finisher', { damage: 300 }), card('unaffordable', { cost: 6 })]);
  assert.throws(() => createCoopCombat([roster[0]]), status(400));
  assert.throws(() => createCoopCombat([roster[0], roster[0]]), status(400));
  const start = deepFreeze(createCoopCombat(roster));
  assert.throws(() => view(start, 'outside'), status(403));
  assert.throws(() => end(start, 'outside'), status(403));
  assert.throws(() => end(start, 'b'), status(400));
  assert.throws(() => exchange(start, 'a', 'discard_draw', instance(start, 'b')), status(404));
  assert.throws(() => play(start, 'a', 'finisher', 'self'), status(400));
  assert.throws(() => play(start, 'a', 'unaffordable'), /Pas assez de Chakra/);
  assert.throws(() => applyCoopAction(start, 'a', { type: 'play' }), status(400));
  assert.throws(() => applyCoopAction(start, 'a', { type: 'reserve' }), status(400));
  const won = play(start, 'a', 'finisher');
  assert.equal(view(won).enemy.hp, 0);
  assert.equal(view(won).state, 'victory');
  assert.equal(view(won).rewards, null);
  assert.throws(() => end(won, 'a'), status(400));
  const forfeited = applyCoopAction(start, 'b', { type: 'forfeit' });
  assert.equal(view(forfeited).state, 'defeat');
  assert.ok(view(forfeited).logs.some(l => l.type === 'forfeit' && l.playerId === 'b'));
});
