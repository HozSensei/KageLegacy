import assert from 'node:assert/strict';
import {
  assertUniqueAmongRoster,
  formatNinjaDisplayName,
  ninjaIdentityKey,
} from '../src/services/ninjaNaming.js';
import { pickUniqueCivName } from '../src/services/ninjaNameGenerator.js';
import { generateNinjaProfile } from '../src/services/ninjaGenerator.js';

assert.equal(formatNinjaDisplayName('Haruki Tanaka'), 'Haruki — Tanaka');
assert.equal(ninjaIdentityKey('Haruki Tanaka'), ninjaIdentityKey('Haruki Tanaka'));
assert.notEqual(ninjaIdentityKey('Haruki Tanaka'), ninjaIdentityKey('Haruki Suzuki'));

const roster = [{ name: 'Haruki Tanaka' }];
assert.throws(
  () => assertUniqueAmongRoster('Haruki Tanaka', roster),
  /fait déjà partie/
);
assert.doesNotThrow(() => assertUniqueAmongRoster('Haruki Suzuki', roster));

const forbidden = new Set([ninjaIdentityKey('Sora Yamamoto')]);
const generated = await pickUniqueCivName({ forbiddenIdentityKeys: forbidden });
assert.notEqual(ninjaIdentityKey(generated), ninjaIdentityKey('Sora Yamamoto'));
assert.ok(generated.includes(' '), 'full name should contain given and family');

const mockClan = { id: 1, name: 'Yamanaka', is_noble: false, genjutsu_bonus: 2, intelligence_bonus: 3, speed_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0 };
const profile = await generateNinjaProfile({
  clan: mockClan,
  grade: 'Genin',
  characterTrait: 'Discipline',
});
assert.ok(profile.name.includes(' '), 'profile name is prénom + nom civil');
assert.equal(profile.clan_trait_id, mockClan.id);

console.log('ninjaNaming: OK');
