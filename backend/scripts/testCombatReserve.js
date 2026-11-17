import assert from 'node:assert/strict';
import { __test } from '../src/services/combatEngineService.js';
import { drawCards } from '../src/services/deckCombat/deckRuntime.js';

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
console.log('Combat reserve and chakra carryover tests passed');
