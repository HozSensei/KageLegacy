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

async function testHardResetAssignsPoolsBeforeRivalry() {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../src/services/seasonResetService.js'),
    'utf8'
  );
  const hardFn = src.slice(src.indexOf('export async function hardSeasonReset'));
  assert.ok(hardFn.includes('reinitializeHumanPlayers'));
  assert.ok(hardFn.includes('assignMissingHumanPools'));
  assert.ok(
    hardFn.indexOf('reinitializeHumanPlayers') < hardFn.indexOf('ensureCycleRivalry'),
    'pool assignment must run before village rivalry'
  );
}

async function main() {
  testRoundRobinStillValidForNewPools();
  await testPreviewShape();
  await testHardResetAssignsPoolsBeforeRivalry();
  console.log('test:season-hard-reset OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
