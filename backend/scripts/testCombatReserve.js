import assert from 'node:assert/strict';
import { __test } from '../src/services/combatEngineService.js';
import { drawCards } from '../src/services/deckCombat/deckRuntime.js';
import { executeEnemyIntent, generateEnemyFromTemplate } from '../src/services/combatAIService.js';

const { useCardTurnAction, chakraCarryover, returnReservedCard, hydrateSession, publicState } =
  __test;
const card = { instanceId: 'one', element: 'katon' };
const other = { instanceId: 'two' };
const session = {
  state: 'in_progress',
  currentPhase: 'player_turn',
  player: { hand: [card, other], chakra: 2, discardPile: [] },
};
const reserved = useCardTurnAction(session, 'one', true);
assert.deepEqual(reserved.hand, [other]);
assert.deepEqual(reserved.reserveCard, card);
assert.equal(reserved.chakra, 2);
assert.equal(reserved.discardedForChakra, true);
assert.throws(() => useCardTurnAction({ ...session, player: reserved }, 'two'), /déjà utilisée/);
assert.throws(
  () => useCardTurnAction({ ...session, player: reserved }, 'two', true),
  /déjà utilisée/
);
const discarded = useCardTurnAction(session, 'one');
assert.equal(discarded.chakra, 3);
assert.deepEqual(discarded.discardPile, [card]);
assert.throws(
  () => useCardTurnAction({ ...session, player: discarded }, 'two', true),
  /déjà utilisée/
);
assert.throws(() => useCardTurnAction(session, 'missing', true), /absente/);
assert.throws(
  () => useCardTurnAction({ ...session, currentPhase: 'enemy_turn' }, 'one', true),
  /tour/
);
assert.throws(() => useCardTurnAction({ ...session, state: 'victory' }, 'one', true), /terminé/);

const hydrated = hydrateSession({ player_state_json: JSON.stringify(reserved) });
assert.deepEqual(hydrated.player.reserveCard, card);
const publicPlayer = publicState({ player: hydrated.player, enemy: {} }).player;
assert.deepEqual(publicPlayer.reservedCard, card);
assert.equal('reserveCard' in publicPlayer, false);
assert.equal(publicState({ player: {}, enemy: {} }).player.reservedCard, null);
assert.equal(chakraCarryover({}), 0);
assert.equal(chakraCarryover({ chakra: -1 }), 0);
assert.equal(chakraCarryover({ chakra: 0 }), 0);
assert.equal(chakraCarryover({ chakra: 1 }), 1);
assert.equal(chakraCarryover({ chakra: 7 }), 1);

const returned = returnReservedCard({
  ...reserved,
  hand: [],
  drawPile: Array.from({ length: 12 }, (_, i) => ({ instanceId: `d${i}` })),
});
assert.deepEqual(returned.player.hand, [card]);
assert.equal(returned.player.reserveCard, null);
assert.deepEqual(returned.logs, [{ type: 'reserve_return', instanceId: 'one' }]);
const drawn = drawCards(returned.player, 5);
assert.equal(drawn.player.hand.length, 6);
assert.equal(drawn.drawn.length, 5);
const capped = drawCards(returned.player, 12);
assert.equal(capped.player.hand.length, 10);
assert.equal(capped.autoDiscarded.length, 3);
assert.ok(capped.player.hand.includes(card));
const fullHand = Array.from({ length: 10 }, (_, i) => ({ instanceId: `h${i}` }));
const fullReturn = returnReservedCard({ hand: fullHand, reserveCard: card, discardPile: [other] });
assert.equal(fullReturn.player.hand.length, 10);
assert.ok(fullReturn.player.hand.includes(card));
assert.deepEqual(fullReturn.player.discardPile, [other, fullHand[9]]);
assert.equal(fullReturn.player.reserveCard, null);
assert.deepEqual(fullReturn.logs, [
  { type: 'reserve_return', instanceId: 'one' },
  { type: 'discard', instanceId: 'h9', reason: 'hand_full' },
]);
assert.deepEqual(returnReservedCard({ hand: [] }).logs, []);
const enemy = __test.configurePrototypeEnemy(generateEnemyFromTemplate('ronin_bandit', 1));
const persistent = {
  ...session.player,
  turnPrototype: 'persistent',
  hp: 100,
  maxHp: 100,
  drawPile: Array.from({ length: 5 }, (_, i) => ({ instanceId: `p${i}` })),
};
const attempt = (player, id, draw = false) =>
  useCardTurnAction({ ...session, player }, id, false, draw);
const exchanged = attempt(persistent, 'one', true);
assert.deepEqual(
  exchanged.hand.map(c => c.instanceId),
  ['two', 'p0']
);
assert.deepEqual(exchanged.discardPile, [card]);
assert.throws(() => attempt({ ...persistent, drawPile: [] }, 'one', true), /Aucune autre/);
assert.throws(() => attempt(session.player, 'one', true), /réservée/);
assert.throws(
  () => useCardTurnAction({ ...session, player: persistent }, 'one', true),
  /conservée/
);
const paid = attempt(exchanged, 'two');
assert.equal(paid.chakra, 3);
assert.equal(chakraCarryover(paid), 0);
assert.throws(() => attempt(paid, 'p0', true), /Quota/);
assert.throws(() => attempt(attempt(persistent, 'one'), 'two'), /déjà gagné/);
const reloaded = hydrateSession({
  player_state_json: JSON.stringify(paid),
  enemy_state_json: JSON.stringify(enemy),
});
const snapshot = publicState(reloaded);
assert.equal(snapshot.suppressRewards, true);
assert.equal(snapshot.player.discardsRemaining, 0);
assert.equal(snapshot.player.chakraDiscardAvailable, false);
assert.equal(snapshot.enemy.intent.type, 'attack');
assert.deepEqual(snapshot.enemy.nextIntent, { type: 'defend' });
assert.equal(
  executeEnemyIntent(enemy, persistent).enemy.intent.type,
  snapshot.enemy.nextIntent.type
);
const refreshed = __test.refreshHand({ ...paid, discardedForChakra: false }).player;
assert.equal(refreshed.hand.length, 5);
assert.equal(refreshed.hand[0].instanceId, 'p0');
assert.equal(publicState({ player: refreshed, enemy }).player.discardsRemaining, 2);
assert.equal(publicState({ player: refreshed, enemy }).player.chakraDiscardAvailable, true);
console.log('Combat reserve, chakra carryover and turn prototype tests passed');
