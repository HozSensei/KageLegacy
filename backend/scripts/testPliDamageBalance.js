/**
 * Smoke test — rééquilibrage dégâts / PV de match.
 * Usage : node scripts/testPliDamageBalance.js
 */
import assert from 'node:assert/strict';
import {
  computeDamage,
  computeTieDamage,
} from '../src/services/combat/pli/power.js';
import {
  DAMAGE_MIN,
  DECISIVE_EDGE,
} from '../src/services/combat/pli/constants.js';
import { computeMatchPvFromRating, MATCH_PV_PER_RATING } from '../src/services/ninjaStats.js';

assert.equal(MATCH_PV_PER_RATING, 5);
assert.equal(DAMAGE_MIN, 8);
assert.equal(DECISIVE_EDGE, 8);

const flat = {
  taijutsu: 6,
  ninjutsu: 6,
  genjutsu: 6,
  medecine: 6,
  vitesse: 6,
  intelligence: 6,
};
assert.equal(computeMatchPvFromRating(flat), 30);

const close = computeDamage(12, 10);
assert.ok(close >= DAMAGE_MIN, `dégâts proches trop faibles: ${close}`);
assert.ok(close < 45, `dégâts proches trop élevés: ${close}`);

const decisive = computeDamage(20, 10);
assert.ok(decisive > close, 'pli décisif doit faire plus mal');

const tie = computeTieDamage(12, 11);
assert.ok(tie >= 4, `chip égalité trop faible: ${tie}`);

const hitsToKo = computeMatchPvFromRating(flat) / close;
assert.ok(hitsToKo >= 2 && hitsToKo <= 6, `hits-to-KO hors cible: ${hitsToKo}`);

console.log('testPliDamageBalance OK', { close, decisive, tie, hitsToKo: +hitsToKo.toFixed(1) });
