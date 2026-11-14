import assert from 'node:assert/strict';
import {
  assertUniqueAmongRoster,
  formatNinjaDisplayName,
  ninjaIdentityKey,
} from '../src/services/ninjaNaming.js';
import {
  pickUniqueCivName,
  hasRemainingGlobalNames,
  enumerateAllIdentityKeysForClan,
} from '../src/services/ninjaNameGenerator.js';
import { generateNinjaProfile } from '../src/services/ninjaGenerator.js';

assert.equal(formatNinjaDisplayName('Ren Benigiri'), 'Ren — Benigiri');

const roster = [{ name: 'Ren Benigiri' }];
assert.throws(
  () => assertUniqueAmongRoster('Ren Benigiri', roster),
  /fait déjà partie/
);

const nobleClan = { name: 'Benigiri', is_noble: true };
const globalEmpty = new Set();
const nobleName = pickUniqueCivName({
  clan: nobleClan,
  globalForbiddenKeys: globalEmpty,
});
assert.ok(nobleName.endsWith(' Benigiri'), `noble name should end with clan: ${nobleName}`);

const globalTaken = new Set([ninjaIdentityKey(nobleName)]);
const nobleName2 = pickUniqueCivName({
  clan: nobleClan,
  globalForbiddenKeys: globalTaken,
});
assert.notEqual(nobleName2, nobleName);

const saturatedGlobal = enumerateAllIdentityKeysForClan(nobleClan);
assert.equal(hasRemainingGlobalNames(saturatedGlobal, nobleClan), false);

const fallbackName = pickUniqueCivName({
  clan: nobleClan,
  globalForbiddenKeys: saturatedGlobal,
});
assert.ok(fallbackName.endsWith(' Benigiri'), 'fallback allows global duplicate when pool saturated');

const mockClan = {
  id: 1,
  name: 'Yukisawa',
  is_noble: false,
  genjutsu_bonus: 2,
  intelligence_bonus: 3,
  speed_bonus: 0,
  ninjutsu_bonus: 0,
  moral_variance: 0,
};
const profile = await generateNinjaProfile({
  clan: mockClan,
  grade: 'Genin',
  characterTrait: 'Brute',
  forbiddenGlobalKeys: globalEmpty,
});
assert.ok(profile.name.endsWith(' Yukisawa'), `profile uses clan surname: ${profile.name}`);

console.log('ninjaNaming: OK');
