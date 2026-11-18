import assert from 'node:assert/strict';
import { applyHeldTurnStart, heldEffectMods } from '../src/services/deckCombat/heldEffects.js';
import { applyCardPlay, computeCardDamage } from '../src/services/deckCombat/cardEffects.js';
import { createDuelFromBootstrap } from '../../shared/pvp/duelEngine.js';

const held = (instanceId, heldEffect) => ({ instanceId, slug: instanceId, heldEffect });
const player = {
  hp: 50,
  maxHp: 100,
  chakra: 3,
  block: 0,
  statuses: [],
  hand: [],
  drawPile: [],
  discardPile: [],
};
const enemy = { hp: 100, maxHp: 100, block: 0, statuses: [] };

const granted = applyHeldTurnStart({
  ...player,
  reserveCard: held('chakra', { type: 'gain_chakra', value: 2 }),
  hand: [held('block', { type: 'starting_block', value: 6 })],
});
assert.equal(granted.player.chakra, 5);
assert.equal(granted.player.block, 6);
assert.equal(granted.logs.length, 2);

const duplicate = held('same', { type: 'gain_chakra', value: 2 });
const deduped = applyHeldTurnStart({ ...player, hand: [duplicate], reservedCard: duplicate });
assert.equal(deduped.player.chakra, 5);

const mods = heldEffectMods(
  {
    ...player,
    hand: [held('evade', { type: 'evade_percent', value: 15 })],
    reserveCard: held('nin', { type: 'art_damage_percent', statType: 'ninjutsu', value: 20 }),
  },
  { statType: 'ninjutsu' }
);
assert.equal(mods.evadeChance, 0.15);
assert.equal(mods.artDamagePct, 0.2);
assert.equal(
  computeCardDamage(
    { damage: 10, statType: 'ninjutsu' },
    {
      stats: {},
      player: {
        ...player,
        hand: [held('nin', { type: 'art_damage_percent', statType: 'ninjutsu', value: 20 })],
      },
      rng: () => 0.99,
    }
  ).total,
  12
);

const ownHeritage = held('self', { type: 'heal_percent', value: 20 });
const played = applyCardPlay({
  player: { ...player, hand: [ownHeritage] },
  enemy,
  card: { ...ownHeritage, instanceId: 'self', heal: 10, statType: 'common' },
  stats: {},
  rng: () => 0.99,
});
assert.equal(played.player.hp, 60, 'a played heritage cannot boost itself');

const duel = createDuelFromBootstrap({
  matchId: 'held',
  seed: 'held',
  fighters: {
    host: {
      userId: 1,
      chakra: 3,
      hp: 100,
      maxHp: 100,
      stats: {},
      hand: [held('pvp-chakra', { type: 'gain_chakra', value: 2 })],
    },
    guest: { userId: 2, chakra: 3, hp: 100, maxHp: 100, stats: {}, hand: [] },
  },
});
assert.equal(duel.fighters.host.chakra, 5);
assert.equal(duel.fighters.guest.chakra, 3);
console.log('Held effect tests passed');
