#!/usr/bin/env node
/**
 * Prépare le compte démo pour les tests E2E navigateur :
 * assigne 3 missions idle et les résout (rapports + notifications).
 * N'exécute pas le job H72 complet (évite effets de bord saison/pool).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { getClockRow, setHourDev } from '../src/services/gameClock.js';
import { assignMission, resolveMissionsForCycle } from '../src/services/missionService.js';

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

async function boostNinja(ninjaId, patch) {
  const cols = Object.keys(patch);
  await query(
    `UPDATE ninjas SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...cols.map((c) => patch[c]), ninjaId]
  );
}

async function main() {
  const userId = await demoUserId();
  if (!userId) {
    console.error('Compte demo_sensei introuvable — npm run db:seed');
    process.exit(1);
  }

  await query('DELETE FROM idle_missions WHERE user_id = ?', [userId]);
  await query(
    `UPDATE sensei_notifications SET dismissed_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND kind = 'mission_report' AND dismissed_at IS NULL`,
    [userId]
  );

  await setHourDev(0);
  const cycleStartAt = (await getClockRow()).cycle_start_at;

  const bench = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND squad_position IS NULL ORDER BY id LIMIT 3`,
    [userId]
  );
  if (bench.length < 3) {
    console.error('Au moins 3 remplaçants requis sur le compte démo.');
    process.exit(1);
  }

  await boostNinja(bench[0].id, { intelligence: 5, vitesse: 5 });
  await boostNinja(bench[1].id, { intelligence: 9, vitesse: 8 });
  await boostNinja(bench[2].id, { taijutsu: 13 });

  await assignMission(userId, bench[0].id, 'routine');
  await assignMission(userId, bench[1].id, 'infiltration');
  await assignMission(userId, bench[2].id, 'cyclone');

  await resolveMissionsForCycle(cycleStartAt, 72);

  const pending = await query(
    `SELECT COUNT(*) AS c FROM idle_missions WHERE user_id = ? AND status = 'completed'`,
    [userId]
  );
  const notes = await query(
    `SELECT COUNT(*) AS c FROM sensei_notifications
     WHERE user_id = ? AND kind = 'mission_report' AND dismissed_at IS NULL`,
    [userId]
  );

  console.log(
    'E2E_RESULT:' +
      JSON.stringify({
        ok: true,
        pendingMissions: pending[0].c,
        missionNotifications: notes[0].c,
      })
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
