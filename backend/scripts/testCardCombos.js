import assert from 'node:assert/strict';
import { applyCardPlay, computeCardDamage } from '../src/services/deckCombat/cardEffects.js';
import {
  applyTalentAfterCardPlay,
  applyTalentStartOfTurn,
} from '../src/services/deckCombat/talentEffects.js';
import { applyDuelAction, createDuelFromBootstrap } from '../../shared/pvp/duelEngine.js';

const rng = () => 0.99;
const enemy = { hp: 100, maxHp: 100, block: 0, statuses: [] };
const player = {
  hp: 100,
  maxHp: 100,
  chakra: 3,
  statuses: [],
  hand: [],
  drawPile: [{ instanceId: 'drawn' }],
  discardPile: [],
};
const effect = (type, statType, value) => ({
  type,
  condition: 'previous_card_stat_type',
  statType,
  value,
});
const play = (p, card) => applyCardPlay({ player: p, enemy, card, stats: {}, rng });

for (const statType of ['taijutsu', 'ninjutsu', 'genjutsu']) {
  const card = {
    type: 'attack',
    statType: 'taijutsu',
    damage: 10,
    effects: [
      effect('bonus_if', statType, 5),
      effect('draw', statType, 1),
      effect('gain_chakra', statType, 2),
    ],
  };
  const first = play(player, card);
  assert.equal(first.enemy.hp, 90);
  assert.equal(first.player.hand.length, 0);
  assert.equal(first.player.chakra, 3);
  const tracked = applyTalentAfterCardPlay(player, { statType }, []).player;
  const combo = play(tracked, card);
  assert.equal(combo.enemy.hp, 85);
  assert.deepEqual(
    combo.player.hand.map(c => c.instanceId),
    ['drawn']
  );
  assert.equal(combo.player.chakra, 5);
  const reset = applyTalentStartOfTurn(tracked, []).player;
  assert.equal(reset.previousCardStatType, null);
  assert.equal(play(reset, card).enemy.hp, 90);
}

// The PvE and PvP play paths resolve the card before calling the after-play hook.
for (const statType of ['taijutsu', 'ninjutsu', 'genjutsu']) {
  const comboEffect = { type: 'combo_previous', statType, damage: 3, draw: 1, chakra: 2 };
  const card = { type: 'attack', statType: 'taijutsu', damage: 10, effects: [comboEffect] };
  const first = play(player, card);
  assert.equal(first.enemy.hp, 90);
  assert.equal(first.player.chakra, 3);
  assert.equal(first.player.hand.length, 0);
  const setup = play(player, { type: 'skill', statType });
  const afterSetup = applyTalentAfterCardPlay(setup.player, { statType }).player;
  const result = play(afterSetup, card);
  assert.equal(result.enemy.hp, 87);
  assert.equal(result.player.chakra, 5);
  assert.equal(result.player.hand.length, 1);
  assert.ok(!result.logs.some(log => log.type === 'stub_effect'));
  const afterCombo = applyTalentAfterCardPlay(result.player, card).player;
  assert.equal(afterCombo.previousCardStatType, 'taijutsu');
  assert.equal(play(applyTalentStartOfTurn(afterSetup).player, card).enemy.hp, 90);
}

const cumulative = play(
  {
    ...player,
    previousCardStatType: 'taijutsu',
    drawPile: [{ instanceId: 'a' }, { instanceId: 'b' }, { instanceId: 'c' }],
  },
  {
    damage: 10,
    effects: [
      { type: 'multi_strike', hits: 2 },
      { type: 'combo_previous', statType: 'taijutsu', damage: 2, draw: 1, chakra: 1 },
      { type: 'combo_previous', statType: 'taijutsu', damage: 3, draw: 1, chakra: 2 },
      { type: 'combo_previous', statType: 'ninjutsu', damage: 20, draw: 1, chakra: 10 },
      effect('bonus_if', 'taijutsu', 1),
      { type: 'draw', value: 1 },
    ],
  }
);
assert.equal(cumulative.enemy.hp, 68);
assert.equal(cumulative.player.hand.length, 3);
assert.equal(cumulative.player.chakra, 6);
assert.equal(cumulative.logs.filter(log => log.type === 'draw').length, 3);
const invalid = play(
  { ...player, previousCardStatType: 'common' },
  {
    damage: 10,
    effects: [{ type: 'combo_previous', statType: 'common', damage: 5, draw: 1, chakra: 1 }],
  }
);
assert.equal(invalid.enemy.hp, 90);
assert.equal(invalid.player.hand.length, 0);
assert.equal(invalid.player.chakra, 3);
const zero = play(
  { ...player, previousCardStatType: 'taijutsu' },
  { effects: [{ type: 'combo_previous', statType: 'taijutsu', damage: 0, draw: 0, chakra: 0 }] }
);
assert.equal(zero.player.hand.length, 0);
assert.equal(zero.player.chakra, 3);

let tracked = applyTalentAfterCardPlay(player, { statType: 'taijutsu' }).player;
tracked = applyTalentAfterCardPlay(tracked, { type: 'item' }).player;
assert.equal(tracked.previousCardStatType, null);
assert.equal(
  play(tracked, { damage: 10, effects: [effect('bonus_if', 'taijutsu', 5)] }).enemy.hp,
  90
);
const mismatched = play(
  { ...player, previousCardStatType: 'ninjutsu' },
  { effects: [effect('draw', 'taijutsu', 1), effect('gain_energy', 'taijutsu', 2)] }
);
assert.equal(mismatched.player.hand.length, 0);
assert.equal(mismatched.player.chakra, 3);
const energy = play(
  { ...player, previousCardStatType: 'taijutsu' },
  { effects: [effect('gain_energy', 'taijutsu', 2)] }
);
assert.equal(energy.player.chakra, 5);
assert.equal(
  play(
    { ...player, previousCardStatType: 'medicine' },
    { effects: [effect('gain_chakra', 'medicine', 2)] }
  ).player.chakra,
  5
);
assert.equal(
  play(player, {
    effects: [
      { type: 'draw', value: 1 },
      { type: 'gain_chakra', value: 1 },
    ],
  }).player.chakra,
  4
);
assert.throws(() => play(tracked, { cost: 10, statType: 'ninjutsu' }));
assert.equal(tracked.previousCardStatType, null);
const damage = computeCardDamage(
  {
    damage: 10,
    effects: [
      { type: 'bonus_if', condition: 'first_card', value: 2 },
      effect('bonus_if', 'taijutsu', 3),
      { type: 'multi_strike', hits: 2 },
    ],
  },
  { previousCardStatType: 'taijutsu', rng }
);
assert.equal(damage.total, 30);

const duel = createDuelFromBootstrap({
  matchId: 'combo-test',
  seed: 'combo',
  fighters: {
    host: {
      userId: 1,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      hand: [
        { instanceId: 'setup', type: 'skill', cost: 0, statType: 'genjutsu' },
        {
          instanceId: 'combo',
          type: 'attack',
          cost: 0,
          statType: 'taijutsu',
          damage: 10,
          effects: [
            { type: 'combo_previous', statType: 'genjutsu', damage: 5, draw: 1, chakra: 2 },
          ],
        },
      ],
      drawPile: [{ instanceId: 'pvp-draw', type: 'skill', cost: 0 }],
    },
    guest: { userId: 2, hp: 100, maxHp: 100, chakra: 3, stats: {} },
  },
});
const action = (state, kind, seat, instanceId) => {
  const result = applyDuelAction(state, { kind, seat, instanceId });
  assert.equal(result.error, undefined);
  return result.state;
};
let state = action(duel, 'play_card', 'host', 'setup');
assert.equal(state.fighters.host.previousCardStatType, 'genjutsu');
assert.equal(state.fighters.guest.previousCardStatType, null);
state = action(state, 'play_card', 'host', 'combo');
assert.equal(state.fighters.guest.hp, 85);
assert.equal(state.fighters.host.chakra, 5);
assert.ok(state.fighters.host.hand.some(card => card.instanceId === 'pvp-draw'));
state = action(state, 'end_turn', 'host');
state = action(state, 'end_turn', 'guest');
assert.equal(state.fighters.host.previousCardStatType, null);

const commonStats = { taijutsu: 20, ninjutsu: 80, genjutsu: 40, medicine: 10 };
assert.equal(
  computeCardDamage({ damage: 10, statType: 'common' }, { stats: commonStats, rng }).perHit,
  18
);
const commonBreaksChain = applyTalentAfterCardPlay(
  { ...player, previousCardStatType: 'taijutsu' },
  { statType: 'common' }
).player;
assert.equal(commonBreaksChain.previousCardStatType, null);
const medicineCombo = play(
  { ...player, previousCardStatType: 'medicine' },
  { effects: [{ type: 'combo_previous', statType: 'medicine', chakra: 1, costReduction: 2 }] }
);
assert.equal(medicineCombo.player.chakra, 4);
assert.equal(medicineCombo.player.nextCardCostReduction, 2);

const discounted = applyCardPlay({
  player: { ...player, chakra: 2, nextCardCostReduction: 3 },
  enemy,
  card: { cost: 4, statType: 'common', effects: [{ type: 'reduce_next_card_cost', value: 1 }] },
  stats: commonStats,
  rng,
});
assert.equal(discounted.chakraSpent, 1);
assert.equal(discounted.player.chakra, 1);
assert.equal(discounted.player.nextCardCostReduction, 1);
const stacked = play(
  { ...player, nextCardCostReduction: 1 },
  { effects: [{ type: 'reduce_next_card_cost', value: 2 }] }
);
assert.equal(stacked.player.nextCardCostReduction, 2);

const heritagePlayer = {
  ...player,
  chakra: 3,
  block: 0,
  hand: [
    {
      instanceId: 'held-taijutsu',
      slug: 'clan-kazamine',
      heldEffect: { type: 'art_damage_percent', statType: 'taijutsu', value: 20 },
    },
  ],
};
assert.equal(
  computeCardDamage(
    { damage: 10, statType: 'taijutsu' },
    { stats: {}, player: heritagePlayer, rng }
  ).total,
  12
);
const reservedEvade = {
  ...player,
  reserveCard: { instanceId: 'held-genjutsu', heldEffect: { type: 'evade_percent', value: 15 } },
};
assert.equal(reservedEvade.reserveCard.heldEffect.value, 15);
assert.throws(() => play({ ...player, chakra: 0, nextCardCostReduction: 2 }, { cost: 3 }));
console.log('Card combo tests passed');
