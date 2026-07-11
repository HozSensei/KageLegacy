/**
 * Tests dossier d'opération + espionnage enrichi + bots pool average.
 * Usage: node scripts/testOperationDossier.js
 */
import { query } from '../src/config/database.js';
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

const PREFIX = `op_dossier_${Date.now()}`;

async function createHumanWithSquad(poolId, label, power = 40) {
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
         user_id, name, grade, age, squad_position, training_focus,
         taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
         moral, weekly_forme, battle_strategy, character_trait, element_affinity
       ) VALUES (?, ?, 'Chunin', 16, ?, 'Taijutsu', ?, ?, 30, 20, 45, 30, 15, 'Passable', 'Offensive', 'Discipline', 'Katon')`,
      [userId, `${label}_n${pos}`, pos, power, power - 5]
    );
  }
  return userId;
}

async function cleanupPool(poolId, userIds) {
  for (const userId of userIds) {
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
  const poolResult = await query(
    `INSERT INTO pools (division_level, season_number, current_cycle, status) VALUES (5, 1, 1, 'active')`
  );
  const poolId = poolResult.insertId;

  const userA = await createHumanWithSquad(poolId, 'alpha', 42);
  const userB = await createHumanWithSquad(poolId, 'beta', 38);

  const avg = await computePoolHumansAveragePower(poolId);
  console.assert(avg > 0, 'pool average power computed');
  console.assert(avg > 35 && avg < 50, `pool avg in range, got ${avg}`);

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

  const scout = await generateScoutReport(userA, 1, 'fr');
  if (scout) {
    console.assert(scout.tier === 'none', 'sans recon → pas de rapport');
    console.assert(scout.lockReason === 'no_recon', 'lockReason no_recon');
  }

  await cleanupPool(poolId, [userA, userB]);
  console.log('testOperationDossier: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
