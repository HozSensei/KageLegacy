#!/usr/bin/env node
/**
 * Playtest missions idle : durées par rang, cap 3, résolution au fil de l'eau.
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
  await getGameClock();

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
  assert(a1.resolvesAtHour === 4, `D résout à H4 (got ${a1.resolvesAtHour})`);
  assert(a2.resolvesAtHour === 8, `C résout à H8 (got ${a2.resolvesAtHour})`);
  assert(a3.resolvesAtHour === 24, `B résout à H24 (got ${a3.resolvesAtHour})`);

  console.log(`✅ 3 contrats envoyés (#${a1.missionId}, #${a2.missionId}, #${a3.missionId})`);

  const mid = await getMissionsForUser(userId);
  assert(mid.activeMissions.length === 3, '3 missions actives attendues');
  assert(mid.slotsRemaining === 0, 'cap 3 atteint');
  assert(mid.maxActiveMissions === 3, 'maxActiveMissions = 3');

  let rejected = false;
  try {
    // Cap atteint — même avec un 4e ninja théorique
    await assignMission(userId, nD.id, 'D');
  } catch (e) {
    rejected = e.statusCode === 409;
  }
  assert(rejected, '4e mission refusée (cap ou ninja déjà en mission)');

  await jumpAndTick(4);
  const afterD = await getMissionsForUser(userId);
  assert(afterD.activeMissions.length === 2, 'D résolue à H4');
  assert((afterD.pendingCollection?.length ?? 0) + (afterD.failedMissions?.length ?? 0) >= 1, 'Rapport D prêt');
  console.log('  H4: mission D résolue');

  await jumpAndTick(8);
  const afterC = await getMissionsForUser(userId);
  assert(afterC.activeMissions.length === 1, 'C résolue à H8');
  console.log('  H8: mission C résolue');

  await jumpAndTick(24);
  const afterB = await getMissionsForUser(userId);
  assert(afterB.activeMissions.length === 0, 'B résolue à H24');
  console.log('  H24: mission B résolue');

  const pending = afterB.pendingCollection?.length ?? 0;
  const failed = afterB.failedMissions?.length ?? 0;
  console.log(`  Rapports : ${pending} à collecter · ${failed} échec(s)`);
  assert(pending + failed >= 1, 'Au moins une mission résolue');

  const notes = await getUnreadNotifications(userId);
  const missionNotes = notes.filter((n) => n.kind === 'mission_report');
  assert(missionNotes.length >= pending + failed, 'Notifications mission_report manquantes');
  console.log(`✅ ${missionNotes.length} notification(s) mission_report`);

  if (pending > 0) {
    const collected = await collectMissionRewards(userId);
    assert(collected.collected === pending, 'Collecte incomplète');
    const ryosAfter = (await getDebtStatus(userId)).ryos;
    assert(ryosAfter >= ryosBefore, 'Ryos non crédités après collecte');
    console.log(
      `✅ Collecte : +${collected.totalRyos} Ryos (${collected.collected} rapport(s))`
    );
  }

  // Recyclage : après résolution, un ninja peut repartir (même rang).
  await setHourDev(30);
  const freeAgain = await getMissionsForUser(userId);
  assert(freeAgain.availableNinjas.length >= 1, 'Ninja disponible après résolution');
  const again = await assignMission(userId, freeAgain.availableNinjas[0].id, 'D');
  assert(again.resolvesAtHour === 34, `2e D depuis H30 → H34 (got ${again.resolvesAtHour})`);
  console.log('✅ Recyclage ninja / même rang OK');

  console.log('\n✅ Playtest missions terminé.\n');
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
