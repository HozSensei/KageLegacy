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

assert.equal(formatNinjaDisplayName('Ren Uchiwa'), 'Ren — Uchiwa');

const roster = [{ name: 'Ren Uchiwa' }];
assert.throws(
  () => assertUniqueAmongRoster('Ren Uchiwa', roster),
  /fait déjà partie/
);

const uchiwaClan = { name: 'Uchiwa', is_noble: true };
const globalEmpty = new Set();
const nobleName = pickUniqueCivName({
  clan: uchiwaClan,
  globalForbiddenKeys: globalEmpty,
});
assert.ok(nobleName.endsWith(' Uchiwa'), `noble name should end with clan: ${nobleName}`);

const globalTaken = new Set([ninjaIdentityKey(nobleName)]);
const nobleName2 = pickUniqueCivName({
  clan: uchiwaClan,
  globalForbiddenKeys: globalTaken,
});
assert.notEqual(nobleName2, nobleName);

const saturatedGlobal = enumerateAllIdentityKeysForClan(uchiwaClan);
assert.equal(hasRemainingGlobalNames(saturatedGlobal, uchiwaClan), false);

const fallbackName = pickUniqueCivName({
  clan: uchiwaClan,
  globalForbiddenKeys: saturatedGlobal,
});
assert.ok(fallbackName.endsWith(' Uchiwa'), 'fallback allows global duplicate when pool saturated');

const mockClan = {
  id: 1,
  name: 'Yamanaka',
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
assert.ok(profile.name.endsWith(' Yamanaka'), `profile uses clan surname: ${profile.name}`);

console.log('ninjaNaming: OK');
