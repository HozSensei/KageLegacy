import assert from 'node:assert/strict';
import {
  generateSpecializedStats,
  rollStatBases,
} from '../src/services/ninjaGenerator.js';

function statSum(stats) {
  return Object.values(stats).reduce((acc, value) => acc + value, 0);
}

function testGeninBaseSpread() {
  const bases = [];
  for (let i = 0; i < 40; i++) {
    bases.push(rollStatBases('Genin'));
  }

  const minTai = Math.min(...bases.map((b) => b.taijutsu));
  const maxTai = Math.max(...bases.map((b) => b.taijutsu));
  assert.ok(minTai >= 2 && maxTai <= 4, 'Genin taijutsu base in 2–4');
  assert.ok(minTai < maxTai, 'Genin bases should vary');

  const unique = new Set(bases.map((b) => JSON.stringify(b)));
  assert.ok(unique.size > 5, 'Genin base spreads should not be identical');
}

function testOrdinaireProfilesDiffer() {
  const profiles = [];
  for (let i = 0; i < 25; i++) {
    profiles.push(generateSpecializedStats('Genin', 'ninjutsu', 'ordinaire'));
  }

  const uniqueTotals = new Set(profiles.map(statSum));
  assert.ok(uniqueTotals.size >= 8, 'ordinaire ninjutsu genin totals should spread');

  const uniqueProfiles = new Set(profiles.map((p) => JSON.stringify(p)));
  assert.ok(uniqueProfiles.size >= 20, 'ordinaire profiles should be mostly unique');
}

function testPotentialStillMatters() {
  const ordinaire = generateSpecializedStats('Genin', 'taijutsu', 'ordinaire');
  const prodige = generateSpecializedStats('Genin', 'taijutsu', 'prodige');
  assert.ok(statSum(prodige) > statSum(ordinaire), 'prodige still above ordinaire on average');

  let prodigeWins = 0;
  for (let i = 0; i < 20; i++) {
    const o = generateSpecializedStats('Genin', 'genjutsu', 'ordinaire');
    const p = generateSpecializedStats('Genin', 'genjutsu', 'prodige');
    if (statSum(p) > statSum(o)) prodigeWins += 1;
  }
  assert.ok(prodigeWins >= 14, 'prodige budget usually beats ordinaire despite variance');
}

testGeninBaseSpread();
testOrdinaireProfilesDiffer();
testPotentialStillMatters();
console.log('testGeninStatVariance: OK');
