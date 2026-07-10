/**
 * Tests du calendrier round-robin des ligues.
 * Usage: npm run test:pool-schedule
 */

import assert from 'node:assert/strict';
import {
  buildRoundRobinSchedule,
  POOL_SIZE,
  SEASON_CYCLES,
  validateRoundRobinSchedule,
} from '../src/services/poolSchedule.js';

function testSixPlayerSchedule() {
  const memberIds = [101, 102, 103, 104, 105, 106];
  const schedule = buildRoundRobinSchedule(memberIds, SEASON_CYCLES);

  assert.equal(schedule.length, SEASON_CYCLES * (POOL_SIZE / 2));
  assert.ok(validateRoundRobinSchedule(schedule, memberIds.length), 'schedule must be valid');

  const cycle1 = schedule.filter((entry) => entry.seasonCycle === 1);
  assert.equal(cycle1.length, 3);
  assert.deepEqual(
    cycle1.map((entry) => [entry.homeUserId, entry.awayUserId]),
    [
      [101, 106],
      [102, 105],
      [103, 104],
    ]
  );
}

function testReturnLegSwapsHomeAway() {
  const memberIds = [1, 2, 3, 4];
  const schedule = buildRoundRobinSchedule(memberIds, 6);
  const firstLeg = schedule.find((entry) => entry.seasonCycle === 1);
  const returnLeg = schedule.find(
    (entry) =>
      entry.seasonCycle === 4 &&
      entry.homeUserId === firstLeg.awayUserId &&
      entry.awayUserId === firstLeg.homeUserId
  );

  assert.ok(returnLeg, 'return leg should mirror first-leg pairing');
}

function main() {
  testSixPlayerSchedule();
  testReturnLegSwapsHomeAway();
  console.log('test:pool-schedule OK');
}

main();
