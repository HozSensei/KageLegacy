/**
 * Tests du service de reset global de saison (aperçu + algorithme, sans exécution destructive).
 * Usage: npm run test:season-hard-reset
 */

import assert from 'node:assert/strict';
import { collectSeasonResetPreview } from '../src/services/seasonResetService.js';
import {
  buildRoundRobinSchedule,
  validateRoundRobinSchedule,
} from '../src/services/poolSchedule.js';

function testRoundRobinStillValidForNewPools() {
  const memberIds = [1, 2, 3, 4, 5, 6];
  const schedule = buildRoundRobinSchedule(memberIds, 10);
  assert.ok(
    validateRoundRobinSchedule(schedule, memberIds.length),
    'new pools must get a valid schedule after reset'
  );
}

async function testPreviewShape() {
  try {
    const preview = await collectSeasonResetPreview();
    assert.equal(typeof preview.humanPlayers, 'number');
    assert.equal(typeof preview.heritageScrollsKept, 'number');
    assert.equal(typeof preview.clansKept, 'number');
    assert.ok(Array.isArray(preview.humans));
    assert.ok(Array.isArray(preview.eliteSubs));
  } catch (error) {
    if (error?.code === 'ECONNREFUSED') {
      console.log('SKIP: base indisponible — aperçu non testé');
      return;
    }
    throw error;
  }
}

async function main() {
  testRoundRobinStillValidForNewPools();
  await testPreviewShape();
  console.log('test:season-hard-reset OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
