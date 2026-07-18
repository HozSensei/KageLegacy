/**
 * Tests unitaires légers : ensureUserPool / assignMissingHumanPools (sans DB si down).
 * Usage: npm run test:ensure-user-pool
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function assertSourceContains(relPath, needles) {
  const src = readFileSync(join(root, relPath), 'utf8');
  for (const needle of needles) {
    assert.ok(src.includes(needle), `${relPath} must contain: ${needle}`);
  }
}

function testHardResetOrdersPoolBeforeRivalry() {
  const src = readFileSync(join(root, 'src/services/seasonResetService.js'), 'utf8');
  const poolIdx = src.indexOf('reinitializeHumanPlayers');
  const rivalryIdx = src.indexOf('ensureCycleRivalry');
  assert.ok(poolIdx > 0 && rivalryIdx > 0, 'reset must call both steps');
  // Dans hardSeasonReset, la réinit joueurs doit apparaître avant la rivalité village.
  const hardFn = src.slice(src.indexOf('export async function hardSeasonReset'));
  const reinitInHard = hardFn.indexOf('reinitializeHumanPlayers');
  const rivalryInHard = hardFn.indexOf('ensureCycleRivalry');
  assert.ok(reinitInHard >= 0 && rivalryInHard >= 0);
  assert.ok(
    reinitInHard < rivalryInHard,
    'hard reset must assign pools before village rivalry'
  );
  assert.ok(hardFn.includes('assignMissingHumanPools'));
  assert.ok(hardFn.includes('non-fatal') || hardFn.includes('villageRivalry'));
}

function testEnsureExports() {
  assertSourceContains('src/services/poolService.js', [
    'export async function ensureUserPool',
    'export async function assignMissingHumanPools',
  ]);
  assertSourceContains('src/routes/league.js', ['ensureUserPool']);
  assertSourceContains('src/routes/squad.js', ['ensureUserPool']);
  assertSourceContains('src/routes/admin.js', ['/pools/assign-missing']);
}

async function testDbBackfillOptional() {
  try {
    const { assignMissingHumanPools, findUserPool } = await import(
      '../src/services/poolService.js'
    );
    const before = await assignMissingHumanPools({ seasonNumber: 1 });
    assert.equal(typeof before.total, 'number');
    assert.equal(typeof before.assigned, 'number');
    for (const row of before.results.filter((r) => r.ok)) {
      const pool = await findUserPool(row.userId);
      assert.ok(pool, `user ${row.userId} must have a pool after backfill`);
    }
  } catch (error) {
    if (error?.code === 'ECONNREFUSED') {
      console.log('SKIP: base indisponible — backfill non exécuté');
      return;
    }
    throw error;
  }
}

async function main() {
  testHardResetOrdersPoolBeforeRivalry();
  testEnsureExports();
  await testDbBackfillOptional();
  console.log('test:ensure-user-pool OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
