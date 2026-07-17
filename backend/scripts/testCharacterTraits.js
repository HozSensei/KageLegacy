/**
 * Smoke test profils de caractère (sans BDD).
 * Usage : node scripts/testCharacterTraits.js
 */
import assert from 'node:assert/strict';
import {
  CHARACTER_TRAITS,
  TRAIT_STAT,
  applyTraitBoost,
  distributeCharacterTraits,
  resolveTraitPayload,
  rollCharacterTrait,
} from '../src/services/characterTraits.js';

assert.equal(CHARACTER_TRAITS.length, 6);
assert.equal(TRAIT_STAT.Brute, 'taijutsu');
assert.equal(TRAIT_STAT.Stratege, 'intelligence');

const none = resolveTraitPayload(null, 2);
assert.equal(none.character_trait, null);
assert.equal(none.trait_boost, null);

const brute = resolveTraitPayload('Brute', 2);
assert.equal(brute.character_trait, 'Brute');
assert.equal(brute.trait_boost, 2);

const stats = applyTraitBoost(
  { taijutsu: 5, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 5 },
  'Brute',
  2,
  'Genin'
);
assert.equal(stats.taijutsu, 7);
assert.equal(stats.ninjutsu, 5);

const capped = applyTraitBoost(
  { taijutsu: 12, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 5 },
  'Brute',
  2,
  'Genin'
);
assert.equal(capped.taijutsu, 12);

const starter = distributeCharacterTraits(6);
assert.equal(starter.length, 6);
assert.ok(starter.some((s) => s.character_trait == null));
assert.ok(starter.some((s) => s.character_trait != null));

let sawNone = false;
let sawBoost2 = false;
for (let i = 0; i < 200; i += 1) {
  const roll = rollCharacterTrait();
  if (roll.character_trait == null) sawNone = true;
  if (roll.trait_boost === 2) sawBoost2 = true;
}
assert.ok(sawNone, 'rollCharacterTrait devrait produire des sans profil');
assert.ok(sawBoost2, 'rollCharacterTrait devrait produire des +2');

console.log('testCharacterTraits: OK');
