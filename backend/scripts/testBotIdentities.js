/**
 * Tests identité bots (villages répartis + prénom sensei).
 * Usage: npm run test:bot-identities
 */

import assert from 'node:assert/strict';
import { botIdentityForSlot, VILLAGE_KUNI } from '../src/services/botFactory.js';

function testSlotDistribution() {
  const villages = new Set();
  const names = new Set();
  for (let i = 0; i < 8; i += 1) {
    const identity = botIdentityForSlot(i);
    assert.ok(VILLAGE_KUNI[identity.villageId], `village ${identity.villageId}`);
    assert.equal(identity.kuni, VILLAGE_KUNI[identity.villageId]);
    assert.equal(identity.senseiName, identity.given);
    assert.doesNotMatch(identity.senseiName, /\bno Kuni\b/);
    assert.ok(!identity.senseiName.includes('·'));
    villages.add(identity.villageId);
    names.add(identity.senseiName);
  }
  assert.equal(villages.size, 4, 'first 4 slots cover all villages');
  assert.equal(names.size, 8, 'names unique across first 8 slots');
  assert.equal(botIdentityForSlot(0).senseiName, 'Torifu');
  assert.equal(botIdentityForSlot(0).kuni, 'Hi no Kuni');
  assert.equal(botIdentityForSlot(0).villageId, 'leaf');
}

function testDeterministic() {
  assert.deepEqual(botIdentityForSlot(0), botIdentityForSlot(0));
  assert.notEqual(botIdentityForSlot(0).villageId, botIdentityForSlot(1).villageId);
}

async function main() {
  testSlotDistribution();
  testDeterministic();
  console.log('test:bot-identities OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
