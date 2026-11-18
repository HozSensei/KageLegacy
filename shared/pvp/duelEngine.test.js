import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDuelAction, createDuelFromBootstrap, publicDuelState } from './duelEngine.js';

const cards = (prefix, count) =>
  Array.from({ length: count }, (_, i) => ({
    instanceId: `${prefix}-${i}`,
    id: `${prefix}-${i}`,
    cost: 0,
    type: 'skill',
    effects: [],
  }));
const duel = () =>
  createDuelFromBootstrap({
    seed: 'test',
    matchId: 'test',
    fighters: {
      host: { hand: cards('host', 5), drawPile: cards('host-draw', 12) },
      guest: { hand: cards('guest', 5), drawPile: cards('guest-draw', 12) },
    },
  });
const act = (state, kind, seat, instanceId) => {
  const result = applyDuelAction(state, { kind, seat, instanceId });
  assert.equal(result.error, undefined);
  return result.state;
};

test('report automatique limité à un chakra et consommé au prochain tour', () => {
  let state = duel();
  state = act(state, 'end_turn', 'host');
  assert.equal(state.fighters.host.chakraCarry, 1);
  assert.equal(state.fighters.guest.chakra, 3);
  state.fighters.guest.chakra = 0;
  state = act(state, 'end_turn', 'guest');
  assert.equal(state.fighters.host.chakra, 4);
  assert.equal(state.fighters.host.chakraCarry, 0);
  state = act(state, 'discard_chakra', 'host', state.fighters.host.hand[0].instanceId);
  assert.equal(state.fighters.host.chakra, 5);
  state.fighters.host.chakra = 0;
  state = act(state, 'end_turn', 'host');
  assert.equal(state.fighters.guest.chakra, 3);
  state = act(state, 'end_turn', 'guest');
  assert.equal(state.fighters.host.chakra, 3);
});

test('un poison létal ne peut pas être annulé par la régénération de début de tour', () => {
  let state = duel();
  state.fighters.guest.hp = 1;
  state.fighters.guest.statuses = [
    { key: 'poison', value: 2, duration: 2 },
    { key: 'regen', value: 3, duration: 2 },
  ];
  state.fighters.guest.talentCodes = ['boosted_regen'];

  state = act(state, 'end_turn', 'host');

  assert.equal(state.fighters.guest.hp, 0);
  assert.equal(state.status, 'completed');
  assert.equal(state.winnerSeat, 'host');
  assert.equal(state.phase, 'game_over');
});

test('réserve exclusive, secrète et rendue en plus de la pioche', () => {
  let state = duel();
  const card = state.fighters.host.hand[0];
  state = act(state, 'reserve_card', 'host', card.instanceId);
  assert.equal(state.fighters.host.hand.length, 4);
  assert.equal(state.fighters.host.reservedCard.instanceId, card.instanceId);
  assert.ok(
    applyDuelAction(state, {
      kind: 'reserve_card',
      seat: 'host',
      instanceId: state.fighters.host.hand[0].instanceId,
    }).error
  );
  assert.ok(
    applyDuelAction(state, {
      kind: 'discard_chakra',
      seat: 'host',
      instanceId: state.fighters.host.hand[0].instanceId,
    }).error
  );
  const view = publicDuelState(state, 'guest');
  assert.equal(view.fighters.host.hand, undefined);
  assert.equal(view.fighters.host.reservedCard, undefined);
  assert.equal(view.fighters.host.hasReservedCard, true);
  assert.equal(JSON.stringify(view).includes(card.instanceId), false);
  assert.equal(
    publicDuelState(state, 'host').fighters.host.reservedCard.instanceId,
    card.instanceId
  );
  state = act(state, 'end_turn', 'host');
  state = act(state, 'end_turn', 'guest');
  assert.equal(state.fighters.host.hand.length, 6);
  assert.ok(state.fighters.host.hand.some(c => c.instanceId === card.instanceId));
  assert.equal(state.fighters.host.reservedCard, null);
  assert.equal(state.fighters.host.reservedThisTurn, false);
});

test('défausse puis réserve interdite et ancien état accepté', () => {
  let state = duel();
  delete state.fighters.host.reservedCard;
  delete state.fighters.host.reservedThisTurn;
  delete state.fighters.host.chakraCarry;
  state = act(state, 'discard_chakra', 'host', state.fighters.host.hand[0].instanceId);
  assert.ok(
    applyDuelAction(state, {
      kind: 'reserve_card',
      seat: 'host',
      instanceId: state.fighters.host.hand[0].instanceId,
    }).error
  );
  state = act(state, 'end_turn', 'host');
  delete state.fighters.guest.chakraCarry;
  state = act(state, 'end_turn', 'guest');
  assert.equal(state.fighters.host.chakra, 4);
});

test('retour prioritaire de la réserve et plafond de dix cartes', () => {
  let state = duel();
  const card = state.fighters.host.hand[0];
  state = act(state, 'reserve_card', 'host', card.instanceId);
  state = act(state, 'end_turn', 'host');
  state.fighters.host.hand = cards('existing', 10);
  state = act(state, 'end_turn', 'guest');
  assert.equal(state.fighters.host.hand.length, 10);
  assert.equal(state.fighters.host.hand[9].instanceId, card.instanceId);
  assert.equal(state.fighters.host.discardPile.length, 10);
  assert.ok(state.fighters.host.discardPile.some(c => c.instanceId === 'existing-9'));
});

test('la défausse accorde toujours un chakra, même au maximum ou au-dessus', () => {
  for (const chakra of [2, 3, 4]) {
    let state = duel();
    state.fighters.host.chakra = chakra;
    const card = state.fighters.host.hand[0];
    state = act(state, 'discard_chakra', 'host', card.instanceId);
    assert.equal(state.fighters.host.chakra, chakra + 1);
    assert.ok(state.fighters.host.discardPile.some(c => c.instanceId === card.instanceId));
  }
});

test('la carte réservée compte pour le talent dual_element', () => {
  const attack = {
    instanceId: 'attack',
    id: 'attack',
    type: 'attack',
    statType: 'ninjutsu',
    element: 'katon',
    cost: 0,
    damage: 20,
    effects: [],
  };
  const damage = reservedElement => {
    let state = duel();
    state.fighters.host.hand = [attack, { instanceId: 'reserve', element: reservedElement }];
    state.fighters.host.drawPile = [];
    state.fighters.host.discardPile = [];
    state.fighters.host.talentCodes = ['dual_element'];
    state = act(state, 'reserve_card', 'host', 'reserve');
    state = act(state, 'play_card', 'host', 'attack');
    return 100 - state.fighters.guest.hp;
  };
  assert.ok(damage('suiton') > damage('katon'));
});

test('les journaux publics masquent les identifiants de pioche adverses', () => {
  let state = duel();
  state.fighters.host.hand[0].effects = [{ type: 'draw', value: 1 }];
  state = act(state, 'play_card', 'host', state.fighters.host.hand[0].instanceId);
  const ownDraw = publicDuelState(state, 'host').logs.find(log => log.type === 'draw');
  const opposingDraw = publicDuelState(state, 'guest').logs.find(log => log.type === 'draw');
  assert.equal(ownDraw.instanceIds.length, 1);
  assert.equal(opposingDraw.instanceIds, undefined);
  assert.equal(opposingDraw.count, ownDraw.count);
  assert.equal(opposingDraw.seat, 'host');
  state = act(state, 'discard_chakra', 'host', state.fighters.host.hand[0].instanceId);
  assert.equal(
    publicDuelState(state, 'guest').logs.find(log => log.type === 'discard_chakra').instanceId,
    undefined
  );
  assert.ok(
    publicDuelState(state, 'host').logs.find(log => log.type === 'discard_chakra').instanceId
  );
});
