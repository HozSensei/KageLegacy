import assert from 'node:assert/strict';
import { buildRuntimeDeck } from '../src/services/deckCombat/deckRuntime.js';
import { resolveCardCritChance } from '../src/services/deckCombat/combatArts.js';
import { resolveCardPileDestination } from '../src/services/deckCombat/talentEffects.js';

const card = {
  id: 7,
  slug: 'test-card',
  nameFr: 'Carte',
  nameEn: 'Card',
  type: 'attack',
  statType: 'taijutsu',
  statTypeSecondary: 'ninjutsu',
  rarity: 'rare',
  upgradeLevel: 2,
  passiveBonus: { taijutsu: 3 },
  imageUrl: '/card.webp',
  critChance: 25,
  descriptionFr: 'Description FR',
  descriptionEn: 'Description EN',
  passiveDescriptionFr: 'Passif FR',
  passiveDescriptionEn: 'Passive EN',
  cost: 1,
  damage: 5,
  block: 0,
  heal: 0,
  effects: [{ type: 'innate_crit', chance: 8 }],
  exhaust: true,
};
const metadataKeys = [
  'rarity',
  'upgradeLevel',
  'passiveBonus',
  'statTypeSecondary',
  'imageUrl',
  'descriptionFr',
  'descriptionEn',
  'passiveDescriptionFr',
  'passiveDescriptionEn',
];
const entries = [{ quantity: 2, card }];

const pile = buildRuntimeDeck(entries);
assert.equal(pile.length, 2);
assert.notEqual(pile[0].instanceId, pile[1].instanceId);
for (const runtimeCard of pile) {
  for (const key of metadataKeys) assert.deepEqual(runtimeCard[key], card[key], key);
  assert.equal(runtimeCard.damage, 5);
  assert.deepEqual(runtimeCard.effects, card.effects);
}

const [pve] = pile;
assert.equal(pve.exhaust, true);
assert.equal(Object.hasOwn(pve, 'critChance'), false);
assert.equal(resolveCardCritChance(pve), 8, 'PvE conserve le calcul de critique basé sur les effets');
assert.equal(resolveCardPileDestination(pve), 'exhaust');
assert.equal(buildRuntimeDeck([{ quantity: 1, card: { slug: 'minimal' } }])[0].exhaust, false);
console.log('Métadonnées runtime PvE : OK');
