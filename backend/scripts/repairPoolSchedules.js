#!/usr/bin/env node
/**
 * Répare les calendriers de ligue corrompus (round-robin invalide).
 * Usage: npm run pool:repair-schedules [-- --all] [-- --pool-id=12]
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { repairAllActivePoolSchedules, repairPoolSchedule } from '../src/services/poolService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseArgs(argv) {
  const poolArg = argv.find((arg) => arg.startsWith('--pool-id='));
  return {
    all: argv.includes('--all'),
    poolId: poolArg ? Number(poolArg.split('=')[1]) : null,
    includePlayed: argv.includes('--include-played'),
  };
}

async function main() {
  const { all, poolId, includePlayed } = parseArgs(process.argv.slice(2));
  const options = { onlyScheduled: !includePlayed };

  if (poolId) {
    const result = await repairPoolSchedule(poolId, options);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (all) {
    const results = await repairAllActivePoolSchedules(options);
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const viewerPool = await query(`SELECT id FROM pools WHERE status = 'active' ORDER BY id ASC LIMIT 1`);
  if (!viewerPool[0]) {
    console.log('Aucune ligue active à réparer.');
    return;
  }

  const result = await repairPoolSchedule(viewerPool[0].id, options);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
