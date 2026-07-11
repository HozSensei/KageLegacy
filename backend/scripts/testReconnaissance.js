#!/usr/bin/env node
/**
 * Test mission de reconnaissance : matchmaking bot, défi PvP, fenêtre H36–H70.
 * Usage: npm run test:reconnaissance
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { registerUser } from '../src/services/authService.js';
import { setHourDev, getGameClock } from '../src/services/gameClock.js';
import { joinOrCreatePool, findUserPool } from '../src/services/poolService.js';
import {
  acceptChallenge,
  createChallenge,
  getReconnaissanceState,
  hasPlayedReconThisCycle,
  startMatchmaking,
} from '../src/services/reconnaissanceService.js';
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
  await query(
    'DELETE FROM reconnaissance_challenges WHERE challenger_user_id = ? OR defender_user_id = ?',
    [userId, userId]
  );
  await query(
    'DELETE FROM reconnaissance_missions WHERE home_user_id = ? OR away_user_id = ?',
    [userId, userId]
  );
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
  console.log('=== Test mission de reconnaissance ===\n');

  await setHourDev(36);
  const clock = await getGameClock();
  assert(clock.hour === 36, `horloge H36 (actuel H${clock.hour})`);

  const userA = await createPlaytestUser('playtest_recon_a');
  const userB = await createPlaytestUser('playtest_recon_b');
  const userC = await createPlaytestUser('playtest_recon_c');
  assert(await findUserPool(userA.id), 'pool user A');

  const cycleStartAt = (await getClockRow()).cycle_start_at;

  const stateA = await getReconnaissanceState(userA.id);
  assert(stateA.available, 'fenêtre recon ouverte à H36');
  assert(!stateA.played, 'pas encore joué');

  const challenge = await createChallenge(userB.id, userC.id);
  assert(challenge.challengeId, 'défi créé');

  const fightPvP = await acceptChallenge(challenge.challengeId, userC.id);
  assert(fightPvP.missionId, 'combat PvP après acceptation');
  assert(fightPvP.awayIsBot === false, 'adversaire humain');

  const botFight = await startMatchmaking(userA.id);
  assert(botFight.missionId, 'matchmaking bot crée une mission');
  assert(botFight.awayIsBot === true, 'adversaire bot si pas de match humain');
  assert(await hasPlayedReconThisCycle(userA.id, cycleStartAt), 'user A a joué');

  let failedExpected = false;
  try {
    await startMatchmaking(userA.id);
  } catch (error) {
    failedExpected = error.statusCode === 409;
  }
  assert(failedExpected, 'second matchmaking refusé (déjà joué)');

  const stateB = await getReconnaissanceState(userB.id);
  assert(stateB.played, 'user B a joué via défi');

  console.log('  Défi PvP       :', fightPvP.result, `(mission #${fightPvP.missionId})`);
  console.log('  Matchmaking bot :', botFight.result, `(mission #${botFight.missionId})`);
  console.log('\n✅ Tous les tests reconnaissance ont réussi.');

  await deleteUserByUsername('playtest_recon_a');
  await deleteUserByUsername('playtest_recon_b');
  await deleteUserByUsername('playtest_recon_c');
}

main()
  .catch((error) => {
    console.error('❌', error.message);
    process.exit(1);
  })
  .finally(() => pool.end());
