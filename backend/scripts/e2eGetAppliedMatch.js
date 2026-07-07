#!/usr/bin/env node
/**
 * Retourne un match appliqué avec chronique pour le compte démo (tests Opération).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const rows = await query(
    `SELECT u.id AS userId FROM users u
     WHERE u.username = 'demo_sensei' AND u.is_bot = FALSE LIMIT 1`
  );
  const userId = rows[0]?.userId;
  if (!userId) {
    console.error('Compte demo_sensei introuvable');
    process.exit(1);
  }

  const match = await query(
    `SELECT m.id AS matchId, m.pool_id AS poolId, m.season_cycle AS cycle
     FROM matches m
     INNER JOIN match_narrative_segments s ON s.match_id = m.id
     JOIN sensei hs ON hs.user_id = m.home_user_id
     JOIN sensei aws ON aws.user_id = m.away_user_id
     JOIN pools p ON p.id = m.pool_id
     WHERE (m.home_user_id = ? OR m.away_user_id = ?) AND m.status = 'applied'
     ORDER BY m.id DESC
     LIMIT 1`,
    [userId, userId]
  );

  if (!match[0]) {
    console.error('Aucun match appliqué avec chronique pour le démo');
    process.exit(1);
  }

  console.log(
    'E2E_RESULT:' +
      JSON.stringify({
        ok: true,
        ...match[0],
      })
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
