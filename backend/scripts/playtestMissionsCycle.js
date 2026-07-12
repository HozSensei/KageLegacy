#!/usr/bin/env node
/**
 * Playtest missions idle : 3 paliers, cycle H0→H72, notifications + collecte.
 * Usage: npm run playtest:missions
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { getUnreadNotifications } from '../src/services/senseiNotifications.js';
import { processCycleTick } from '../src/services/cycleJobs.js';
import { getDebtStatus } from '../src/services/economyDebt.js';
import { setHourDev, getGameClock, advanceToHourDev } from '../src/services/gameClock.js';
import {
  assignMission,
  collectMissionRewards,
  getMissionsForUser,
} from '../src/services/missionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function demoUserId() {
  const rows = await query('SELECT id FROM users WHERE is_bot = FALSE ORDER BY id LIMIT 1');
  return rows[0]?.id;
}

async function clearUserMissions(userId) {
  await query('DELETE FROM idle_missions WHERE user_id = ?', [userId]);
}

async function benchNinjas(userId) {
  return query(
    `SELECT id, name, intelligence, vitesse, taijutsu
     FROM ninjas WHERE user_id = ? AND squad_position IS NULL ORDER BY id`,
    [userId]
  );
}

async function boostNinja(ninjaId, patch) {
  const cols = Object.keys(patch);
  const sets = cols.map((c) => `${c} = ?`).join(', ');
  await query(`UPDATE ninjas SET ${sets} WHERE id = ?`, [...cols.map((c) => patch[c]), ninjaId]);
}

async function jumpAndTick(hour) {
  await advanceToHourDev(hour);
  return processCycleTick();
}

async function main() {
  const userId = await demoUserId();
  if (!userId) {
    console.error('Aucun joueur — npm run db:seed');
    process.exit(1);
  }

  console.log('\n🎮 Kage Legacy — playtest missions idle\n');

  await setHourDev(0);
  const clock = await getGameClock();

  await clearUserMissions(userId);
  await query(
    `UPDATE sensei_notifications SET dismissed_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND kind = 'mission_report' AND dismissed_at IS NULL`,
    [userId]
  );

  const bench = await benchNinjas(userId);
  assert(bench.length >= 3, `Au moins 3 remplaçants requis (trouvé ${bench.length})`);

  const [nD, nC, nB] = bench;

  const ryosBefore = (await getDebtStatus(userId)).ryos;

  const a1 = await assignMission(userId, nD.id, 'D');
  const a2 = await assignMission(userId, nC.id, 'C');
  const a3 = await assignMission(userId, nB.id, 'B');

  console.log(`✅ 3 contrats envoyés (#${a1.missionId}, #${a2.missionId}, #${a3.missionId})`);

  const mid = await getMissionsForUser(userId);
  assert(mid.activeMissions.length === 3, '3 missions actives attendues');
  assert(mid.usedTiers.length === 3, '3 paliers utilisés');

  const h36 = await jumpAndTick(36);
  console.log('  H36:', h36?.actions?.length ? 'jobs' : 'ok');
  const afterH36 = await getMissionsForUser(userId);
  assert(afterH36.activeMissions.length === 3, 'Missions toujours actives à H36 (retour H72)');

  await jumpAndTick(71);
  const h72 = await jumpAndTick(72);
  console.log('  H72:', h72?.action === 'cycle_reset' ? 'fin de cycle' : 'tick');

  const afterH72 = await getMissionsForUser(userId);
  const pending = afterH72.pendingCollection?.length ?? 0;
  const failed = afterH72.failedMissions?.length ?? 0;
  console.log(`  Rapports : ${pending} à collecter · ${failed} échec(s)`);
  assert(pending + failed >= 1, 'Au moins une mission résolue');

  const notes = await getUnreadNotifications(userId);
  const missionNotes = notes.filter((n) => n.kind === 'mission_report');
  assert(missionNotes.length >= pending + failed, 'Notifications mission_report manquantes');
  console.log(`✅ ${missionNotes.length} notification(s) mission_report`);

  const sample = missionNotes[0];
  assert(sample.payload?.reportText, 'Texte narratif du rapport manquant');
  console.log(`  Exemple : ${sample.payload.reportText.slice(0, 120)}…`);

  if (pending > 0) {
    const collected = await collectMissionRewards(userId);
    assert(collected.collected === pending, 'Collecte incomplète');
    const ryosAfter = (await getDebtStatus(userId)).ryos;
    assert(ryosAfter >= ryosBefore, 'Ryos non crédités après collecte');
    console.log(
      `✅ Collecte : +${collected.totalRyos} Ryos (${collected.collected} rapport(s))`
    );
  }

  console.log('\n✅ Playtest missions terminé.\n');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
