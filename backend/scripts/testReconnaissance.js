#!/usr/bin/env node
/**
 * Test mission de reconnaissance différée : inscription file, défi PvP, résolution H36.
 * Usage: npm run test:reconnaissance
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { registerUser } from '../src/services/authService.js';
import { setHourDev, advanceToHourDev, getGameClock } from '../src/services/gameClock.js';
import { joinOrCreatePool, findUserPool } from '../src/services/poolService.js';
import { runH36 } from '../src/services/cycleJobs.js';
import {
  acceptChallenge,
  createChallenge,
  getReconnaissanceMission,
  getReconnaissanceState,
  hasPlayedReconThisCycle,
  startMatchmaking,
} from '../src/services/reconnaissanceService.js';
import { getReconNarrativeSegments } from '../src/services/reconNarrativeStore.js';
import { getClockRow } from '../src/services/gameClock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PASSWORD = 'playtest123';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function deleteUserByUsername(username) {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (!rows[0]) return;
  const userId = rows[0].id;

  await query('DELETE FROM reconnaissance_registrations WHERE user_id = ?', [userId]);
  await query(
    'DELETE FROM reconnaissance_challenges WHERE challenger_user_id = ? OR defender_user_id = ?',
    [userId, userId]
  );
  await query(
    'DELETE FROM reconnaissance_missions WHERE home_user_id = ? OR away_user_id = ?',
    [userId, userId]
  );
  await query('DELETE FROM matches WHERE home_user_id = ? OR away_user_id = ?', [userId, userId]);
  await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
  await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function createPlaytestUser(username) {
  await deleteUserByUsername(username);
  const { user } = await registerUser({
    username,
    password: PASSWORD,
    senseiName: `Sensei ${username}`,
    language: 'fr',
  });
  await joinOrCreatePool(user.id);
  return user;
}

async function main() {
  console.log('=== Test mission de reconnaissance (différée H36) ===\n');

  await setHourDev(18);
  const clock = await getGameClock();
  assert(clock.hour === 18, `horloge H18 (actuel H${clock.hour})`);

  const userA = await createPlaytestUser('playtest_recon_a');
  const userB = await createPlaytestUser('playtest_recon_b');
  const userC = await createPlaytestUser('playtest_recon_c');
  assert(await findUserPool(userA.id), 'pool user A');

  const cycleAtH18 = (await getClockRow()).cycle_start_at;

  const stateA = await getReconnaissanceState(userA.id);
  assert(stateA.available, 'fenêtre recon ouverte à H18');
  assert(!stateA.played, 'pas encore joué');

  const challenge = await createChallenge(userB.id, userC.id);
  assert(challenge.challengeId, 'défi créé');

  const accepted = await acceptChallenge(challenge.challengeId, userC.id);
  assert(accepted.status === 'accepted', 'défi accepté sans combat immédiat');

  const regA = await startMatchmaking(userA.id);
  assert(regA.status === 'queued', 'inscription file matchmaking');

  const missionsBefore = await query(
    `SELECT id FROM reconnaissance_missions WHERE cycle_start_at = ?`,
    [cycleAtH18]
  );
  assert(missionsBefore.length === 0, 'aucune mission avant H36');

  let failedExpected = false;
  try {
    await startMatchmaking(userA.id);
  } catch (error) {
    failedExpected = error.statusCode === 409;
  }
  assert(failedExpected, 'double inscription refusée');

  await advanceToHourDev(36);
  const cycleAtH36 = (await getClockRow()).cycle_start_at;
  await query(
    `DELETE FROM cycle_job_runs WHERE cycle_start_at = ? AND job_name = 'h36'`,
    [cycleAtH36]
  );
  const h36 = await runH36(cycleAtH36);
  assert(h36.reconMissions?.length >= 2, 'au moins 2 missions résolues à H36');

  assert(await hasPlayedReconThisCycle(userA.id, cycleAtH36), 'user A a joué');
  assert(await hasPlayedReconThisCycle(userB.id, cycleAtH36), 'user B a joué via défi');
  assert(await hasPlayedReconThisCycle(userC.id, cycleAtH36), 'user C a joué via défi');

  const stateB = await getReconnaissanceState(userB.id);
  assert(stateB.played, 'user B a une mission');
  assert(stateB.lastMission?.missionId, 'mission id présent');

  const narrative = await getReconNarrativeSegments(stateB.lastMission.missionId);
  assert(narrative.length >= 3, 'chronique narrative générée');
  assert(narrative.every((s) => Number(s.unlock_minutes) === 0), 'révélation instantanée');

  const missionPayload = await getReconnaissanceMission(stateB.lastMission.missionId, userB.id);
  assert(missionPayload.chronicle.length >= 3, 'API chronique accessible');
  assert(missionPayload.mission.outcome, 'outcome présent');

  console.log('  Inscription A  : file matchmaking');
  console.log('  Défi B vs C    : accepté → résolu à H36');
  console.log(`  Missions H36   : ${h36.reconMissions.length}`);
  console.log(`  Chronique      : ${narrative.length} segments`);
  console.log('\n✅ Tous les tests reconnaissance ont réussi.');

  await setHourDev(0);
}

main()
  .catch((error) => {
    console.error('❌', error.message);
    process.exit(1);
  })
  .finally(() => pool.end());
