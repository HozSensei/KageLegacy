#!/usr/bin/env node
/**
 * Garantit un calendrier ligue visible pour le compte démo après playtest:cycle.
 * Si la journée courante du pool n'a aucun match, aligne current_cycle sur la
 * prochaine journée avec matchs planifiés.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { findUserPool } from '../src/services/poolService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function demoUserId() {
  const rows = await query(
    `SELECT u.id FROM users u
     WHERE u.username = 'demo_sensei' AND u.is_bot = FALSE LIMIT 1`
  );
  return rows[0]?.id;
}

async function countMatches(poolId, cycle) {
  const rows = await query(
    `SELECT COUNT(*) AS c FROM matches WHERE pool_id = ? AND season_cycle = ?`,
    [poolId, cycle]
  );
  return rows[0]?.c ?? 0;
}

async function main() {
  const userId = await demoUserId();
  if (!userId) {
    console.error('Compte demo_sensei introuvable — npm run db:seed');
    process.exit(1);
  }

  const userPool = await findUserPool(userId);
  if (!userPool) {
    console.error('Pool démo introuvable');
    process.exit(1);
  }

  let cycle = userPool.current_cycle;
  let matchCount = await countMatches(userPool.id, cycle);

  if (!matchCount) {
    const next = await query(
      `SELECT season_cycle AS cycle
       FROM matches
       WHERE pool_id = ? AND status = 'scheduled'
       ORDER BY season_cycle ASC
       LIMIT 1`,
      [userPool.id]
    );

    if (next[0]) {
      cycle = next[0].cycle;
      await query('UPDATE pools SET current_cycle = ? WHERE id = ?', [cycle, userPool.id]);
      matchCount = await countMatches(userPool.id, cycle);
    }
  }

  if (!matchCount) {
    console.error(
      `Aucun match pour le pool démo #${userPool.id} (journée ${userPool.current_cycle})`
    );
    process.exit(1);
  }

  console.log(
    'E2E_RESULT:' +
      JSON.stringify({
        ok: true,
        poolId: userPool.id,
        cycle,
        matchCount,
      })
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
