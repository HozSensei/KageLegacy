import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSimSession,
  playGreedyPlayerTurn,
  simEndTurn,
} from '../src/services/deckCombat/combatBalanceSim.js';

const card = (instanceId, fields = {}) => ({ instanceId, cost: 4, type: 'skill', ...fields });
const ids = cards => cards.map(({ instanceId }) => instanceId);
const discards = logs => logs.filter(({ type }) => type.startsWith('discard_for_'));

function fixture(options, player) {
  const session = createSimSession({ seed: 7, ...options });
  session.enemy.intent = { type: 'defend', block: 1 };
  session.player = { ...session.player, hand: [], drawPile: [], discardPile: [], ...player };
  return session;
}

const retained = card('retained', { heldEffect: { type: 'gain_chakra', value: 1 } });
const upcoming = [
  card('held-drawn', { heldEffect: { type: 'starting_block', value: 2 } }),
  ...['b', 'c', 'd', 'e'].map(id => card(id)),
];

test('La main persistante est complétée à cinq avant les effets de début de tour', () => {
  const session = fixture(
    { persistentHand: true },
    {
      hand: [retained],
      drawPile: upcoming,
      chakra: 1,
      discardedForChakra: true,
      voluntaryDiscards: 2,
    }
  );
  const { player } = simEndTurn(session, session.rng).session;

  assert.deepEqual(ids(player.hand), ['retained', 'held-drawn', 'b', 'c', 'd']);
  assert.deepEqual(ids(player.drawPile), ['e']);
  assert.deepEqual(player.discardPile, []);
  assert.equal(player.chakra, player.maxChakra + 1);
  assert.equal(player.block, 2);
  assert.equal(player.voluntaryDiscards, 0);
  assert.equal(player.discardedForChakra, false);
});

test('Une main persistante au-dessus de cinq reste intacte', () => {
  const hand = [retained, ...upcoming];
  const drawPile = [card('not-drawn')];
  const session = fixture({ persistentHand: true }, { hand, drawPile });
  const { player } = simEndTurn(session, session.rng).session;
  assert.deepEqual(player.hand, hand);
  assert.deepEqual(player.drawPile, drawPile);
  assert.deepEqual(player.discardPile, []);
});

test('Par défaut, pas d’échange et la main est remplacée après ses effets de début de tour', () => {
  const session = fixture({}, { hand: [retained], drawPile: upcoming, chakra: 0 });
  assert.strictEqual(playGreedyPlayerTurn(session, session.rng).session, session);

  const { player } = simEndTurn(session, session.rng).session;
  assert.deepEqual(player.hand, upcoming);
  assert.deepEqual(player.discardPile, [retained]);
  assert.equal(player.chakra, player.maxChakra + 1);
  assert.equal(player.block, 0);
});

test('Greedy privilégie la défausse chakra et s’arrête au quota commun de deux', () => {
  const session = fixture(
    { persistentHand: true },
    {
      chakra: 0,
      hand: [
        card('chakra-fodder'),
        card('attack', { type: 'attack', cost: 1, damage: 10 }),
        card('draw-fodder', { block: 1 }),
        card('still-blocked', { block: 2 }),
      ],
      drawPile: [card('playable', { cost: 0 }), card('not-drawn', { cost: 0 })],
    }
  );
  assert.equal(session.player.voluntaryDiscards, 0);
  const played = [];
  const turn = playGreedyPlayerTurn(session, session.rng, ({ card }) =>
    played.push(card.instanceId)
  );

  assert.deepEqual(discards(turn.logs), [
    { type: 'discard_for_chakra', instanceId: 'chakra-fodder' },
    { type: 'discard_for_draw', instanceId: 'draw-fodder' },
  ]);
  assert.deepEqual(played, ['attack', 'playable']);
  assert.deepEqual(ids(turn.session.player.hand), ['still-blocked']);
  assert.deepEqual(ids(turn.session.player.drawPile), ['not-drawn']);
  assert.equal(turn.session.player.voluntaryDiscards, 2);
  assert.equal(turn.session.player.discardedForChakra, true);
});

test('Deux échanges bloquent ensuite la défausse chakra', () => {
  const session = fixture(
    { persistentHand: true },
    {
      chakra: 0,
      hand: [card('first'), card('second')],
      drawPile: [card('still-blocked'), card('attack', { type: 'attack', cost: 1, damage: 10 })],
    }
  );
  const turn = playGreedyPlayerTurn(session, session.rng);
  assert.deepEqual(discards(turn.logs), [
    { type: 'discard_for_draw', instanceId: 'first' },
    { type: 'discard_for_draw', instanceId: 'second' },
  ]);
  assert.deepEqual(ids(turn.session.player.hand), ['still-blocked', 'attack']);
  assert.equal(turn.session.player.chakra, 0);
  assert.equal(turn.session.player.voluntaryDiscards, 2);
});

test('Sans autre carte, Greedy n’échange pas ; il peut recycler une défausse existante', () => {
  const blocked = card('blocked');
  const session = fixture({ persistentHand: true }, { chakra: 0, hand: [blocked] });
  assert.strictEqual(playGreedyPlayerTurn(session, session.rng).session, session);

  session.player.discardPile = [card('replacement', { cost: 0 })];
  const played = [];
  const turn = playGreedyPlayerTurn(session, session.rng, ({ card }) =>
    played.push(card.instanceId)
  );
  assert.deepEqual(discards(turn.logs), [{ type: 'discard_for_draw', instanceId: 'blocked' }]);
  assert.deepEqual(played, ['replacement']);
  assert.deepEqual(ids(turn.session.player.discardPile), ['blocked', 'replacement']);
  assert.equal(turn.session.player.voluntaryDiscards, 1);
  assert.equal(turn.session.player.discardedForChakra, false);
});
