/**
 * Tests dossier d'opération + espionnage enrichi + bots pool average.
 * Usage: node scripts/testOperationDossier.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import {
  getOperationDossier,
  setOperationPosture,
  OPERATION_POSTURES,
} from '../src/services/operationDossierService.js';
import { generateScoutReport } from '../src/services/scouting.js';
import {
  alignPoolBotsToPoolAverage,
  computePoolHumansAveragePower,
} from '../src/services/botFactory.js';
import { setHourDev, advanceToHourDev } from '../src/services/gameClock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PREFIX = `op_dossier_${Date.now()}`;

async function createHumanWithSquad(poolId, label, clanTraitId) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `${PREFIX}_${label}`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Taijutsu', 10000, 0, 100, 'fr')`,
    [userId, label]
  );
  await query('INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)', [poolId, userId]);
  await query('INSERT INTO pool_standings (pool_id, user_id) VALUES (?, ?)', [poolId, userId]);
  for (let pos = 1; pos <= 3; pos += 1) {
    await query(
      `INSERT INTO ninjas (
         user_id, name, grade, age, squad_position, preparation_type,
         taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
         moral, weekly_forme, battle_strategy, character_trait, element_affinity, clan_trait_id
       ) VALUES (?, ?, 'Chunin', 16, ?, 'Physique', 15, 15, 15, 15, 15, 15, 15, 'Passable', 'Offensive', 'Discipline', 'Katon', ?)`,
      [userId, `${label}_n${pos}`, pos, clanTraitId]
    );
  }
  return userId;
}

async function cleanupPool(poolId, userIds) {
  await query('DELETE FROM matches WHERE pool_id = ?', [poolId]);
  for (const userId of userIds) {
    await query('DELETE FROM cycle_scout_intel WHERE viewer_user_id = ? OR opponent_user_id = ?', [
      userId,
      userId,
    ]);
    await query('DELETE FROM operation_dossiers WHERE user_id = ?', [userId]);
    await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
    await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
    await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
    await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
    await query('DELETE FROM users WHERE id = ?', [userId]);
  }
  await query('DELETE FROM pools WHERE id = ?', [poolId]);
}

async function main() {
  await setHourDev(36);

  const clanRows = await query('SELECT id FROM clan_traits LIMIT 1');
  const clanTraitId = clanRows[0]?.id ?? 1;

  const poolResult = await query(
    `INSERT INTO pools (division_level, season_number, current_cycle, status) VALUES (5, 1, 1, 'active')`
  );
  const poolId = poolResult.insertId;

  const userA = await createHumanWithSquad(poolId, 'alpha', clanTraitId);
  const userB = await createHumanWithSquad(poolId, 'beta', clanTraitId);

  await query(
    `INSERT INTO matches (pool_id, season_cycle, home_user_id, away_user_id, status, environment_slug)
     VALUES (?, 1, ?, ?, 'scheduled', 'pluie')`,
    [poolId, userA, userB]
  );

  const avg = await computePoolHumansAveragePower(poolId);
  console.assert(avg > 0, 'pool average power computed');

  const align = await alignPoolBotsToPoolAverage(poolId);
  console.assert(align.targetPower > 0, 'bots aligned to pool avg');

  for (const posture of OPERATION_POSTURES) {
    console.assert(OPERATION_POSTURES.includes(posture), 'posture enum');
  }

  const saved = await setOperationPosture(userA, 'tank');
  console.assert(saved.operationPosture === 'tank', 'posture saved');

  const dossier = await getOperationDossier(userA, 'fr');
  console.assert(dossier.operationPosture === 'tank', 'dossier posture');
  console.assert(dossier.postureLabel, 'posture label');
  console.assert(dossier.ownSquad.members.length === 3, 'own squad members');
  console.assert(Array.isArray(dossier.advice), 'advice array');
  console.assert(dossier.scoutAvailable, 'scout available at H36');

  const scout = await generateScoutReport(userA, 1, 'fr');
  console.assert(scout?.lockReason === 'no_recon', 'sans recon → no_recon');
  console.assert(scout.phase === 'none', 'phase none sans recon');

  await advanceToHourDev(54);
  const dossierH54 = await getOperationDossier(userA, 'fr');
  console.assert(dossierH54.compositionLocked, 'composition locked at H54');

  await cleanupPool(poolId, [userA, userB]);
  console.log('testOperationDossier: OK');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
