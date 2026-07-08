import assert from 'node:assert/strict';
import {
  assertUniqueAmongRoster,
  formatNinjaDisplayName,
  ninjaIdentityKey,
} from '../src/services/ninjaNaming.js';
import { generateNinjaProfile } from '../src/services/ninjaGenerator.js';

assert.equal(formatNinjaDisplayName('Sora', 'Roturier'), 'Sora — Roturier');
assert.equal(formatNinjaDisplayName('Kenji Uchiwa', 'Uchiwa'), 'Kenji — Uchiwa');
assert.equal(ninjaIdentityKey('Sora', 'Roturier'), ninjaIdentityKey('Sora', 'Roturier'));

const roster = [{ name: 'Sora', clan_name: 'Roturier' }];
assert.throws(
  () => assertUniqueAmongRoster('Sora', 'Roturier', roster),
  /fait déjà partie/
);
assert.doesNotThrow(() => assertUniqueAmongRoster('Kenji', 'Roturier', roster));

const forbidden = new Set([ninjaIdentityKey('Sora', 'Roturier')]);
const clans = [{ id: 1, name: 'Roturier', is_noble: false }];
let generated = null;
for (let i = 0; i < 30; i += 1) {
  const profile = generateNinjaProfile({
    clan: clans[0],
    grade: 'Genin',
    characterTrait: 'Discipline',
    forbiddenIdentityKeys: forbidden,
  });
  if (profile.name !== 'Sora') {
    generated = profile;
    break;
  }
}
assert.ok(generated, 'generator should avoid forbidden identity');

console.log('ninjaNaming: OK');
