import assert from 'node:assert/strict';
import {
  assertUniqueAmongRoster,
  formatNinjaDisplayName,
  ninjaIdentityKey,
} from '../src/services/ninjaNaming.js';
import { pickUniqueCivName } from '../src/services/ninjaNameGenerator.js';
import { generateNinjaProfile } from '../src/services/ninjaGenerator.js';

assert.equal(formatNinjaDisplayName('Ren Uchiwa'), 'Ren — Uchiwa');
assert.equal(formatNinjaDisplayName('Aiko Mizuhara'), 'Aiko — Mizuhara');
assert.notEqual(ninjaIdentityKey('Ren Uchiwa'), ninjaIdentityKey('Ren Nara'));

const roster = [{ name: 'Ren Uchiwa' }];
assert.throws(
  () => assertUniqueAmongRoster('Ren Uchiwa', roster),
  /fait déjà partie/
);

const uchiwaClan = { name: 'Uchiwa', is_noble: true };
const nobleName = pickUniqueCivName({ clan: uchiwaClan });
assert.ok(nobleName.endsWith(' Uchiwa'), `noble name should end with clan: ${nobleName}`);

const roturierClan = { name: 'Roturier', is_noble: false };
const rotName = pickUniqueCivName({ clan: roturierClan });
const rotFamily = rotName.split(' ').slice(1).join(' ');
assert.notEqual(rotFamily, 'Uchiwa');
assert.notEqual(rotFamily, 'Roturier');

const forbidden = new Set([ninjaIdentityKey('Sora Yamaguchi')]);
const generated = pickUniqueCivName({ forbiddenIdentityKeys: forbidden, clan: roturierClan });
assert.notEqual(ninjaIdentityKey(generated), ninjaIdentityKey('Sora Yamaguchi'));

const mockClan = { id: 1, name: 'Yamanaka', is_noble: false, genjutsu_bonus: 2, intelligence_bonus: 3, speed_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0 };
const profile = await generateNinjaProfile({
  clan: mockClan,
  grade: 'Genin',
  characterTrait: 'Discipline',
});
assert.ok(profile.name.endsWith(' Yamanaka'), `profile uses clan surname: ${profile.name}`);

console.log('ninjaNaming: OK');
