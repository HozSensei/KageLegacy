#!/usr/bin/env node
/**
 * Remet le compte démo en état propre pour les tests E2E d'envoi UI :
 * H0, aucune mission idle, notifications mission_report ignorées.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { setHourDev } from '../src/services/gameClock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function demoUserId() {
  const rows = await query(
    `SELECT u.id FROM users u
     JOIN sensei s ON s.user_id = u.id
     WHERE u.username = 'demo_sensei' AND u.is_bot = FALSE LIMIT 1`
  );
  return rows[0]?.id;
}

async function main() {
  const userId = await demoUserId();
  if (!userId) {
    console.error('Compte demo_sensei introuvable — npm run db:seed');
    process.exit(1);
  }

  await query('DELETE FROM idle_missions WHERE user_id = ?', [userId]);
  await query(
    `UPDATE dojo_notifications SET dismissed_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND kind = 'mission_report' AND dismissed_at IS NULL`,
    [userId]
  );

  const clock = await setHourDev(0);

  const bench = await query(
    `SELECT COUNT(*) AS c FROM ninjas WHERE user_id = ? AND squad_position IS NULL`,
    [userId]
  );

  console.log(
    'E2E_RESULT:' +
      JSON.stringify({
        ok: true,
        hour: clock.hour,
        benchNinjas: bench[0].c,
      })
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
