/**
 * Accès missions par rang personnage.
 * Usage: node scripts/testMissionRankAccess.js
 */
import assert from 'node:assert/strict';
import { ASPIRANT_RANK } from '../src/services/characterAppearance.js';
import {
  canPlayMissionRank,
  missionRanksForCharacterRank,
  requiredCharacterRankForMission,
} from '../src/services/missionRankAccess.js';

const cases = [
  [ASPIRANT_RANK, ['D', 'C'], ['B', 'A', 'S']],
  ['Genin', ['D', 'C'], ['B', 'A', 'S']],
  ['Chunin', ['D', 'C', 'B', 'A'], ['S']],
  ['Jonin', ['D', 'C', 'B', 'A'], ['S']],
  ['ANBU', ['D', 'C', 'B', 'A', 'S'], []],
  ['Kage', ['D', 'C', 'B', 'A', 'S'], []],
];

for (const [rank, allowed, denied] of cases) {
  assert.deepEqual([...missionRanksForCharacterRank(rank)], allowed);
  for (const m of allowed) assert.equal(canPlayMissionRank(rank, m), true, `${rank}→${m}`);
  for (const m of denied) assert.equal(canPlayMissionRank(rank, m), false, `${rank}↛${m}`);
}

assert.equal(requiredCharacterRankForMission('D'), ASPIRANT_RANK);
assert.equal(requiredCharacterRankForMission('C'), ASPIRANT_RANK);
assert.equal(requiredCharacterRankForMission('B'), 'Chunin');
assert.equal(requiredCharacterRankForMission('A'), 'Chunin');
assert.equal(requiredCharacterRankForMission('S'), 'ANBU');

console.log('testMissionRankAccess: OK');
