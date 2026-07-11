#!/usr/bin/env node
/**
 * Test lien reconnaissance → espionnage (qualité du rapport).
 * Usage: npm run test:scout-recon
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { registerUser } from '../src/services/authService.js';
import { setHourDev } from '../src/services/gameClock.js';
import { joinOrCreatePool, findUserPool } from '../src/services/poolService.js';
import { startMatchmaking } from '../src/services/reconnaissanceService.js';
import { generateScoutReport } from '../src/services/scouting.js';
import { getUserMatchForCycle } from '../src/services/matchService.js';

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
  await query('DELETE FROM cycle_scout_intel WHERE viewer_user_id = ? OR opponent_user_id = ?', [
    userId,
    userId,
  ]);
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
  console.log('=== Test scout ↔ reconnaissance ===\n');

  const user = await createPlaytestUser('playtest_scout_recon');
  const pool = await findUserPool(user.id);
  assert(pool, 'pool créé');

  const bots = await query(
    `SELECT u.id FROM users u JOIN pool_members pm ON pm.user_id = u.id
     WHERE pm.pool_id = ? AND u.is_bot = TRUE LIMIT 1`,
    [pool.id]
  );
  assert(bots[0], 'bot dans le pool');

  await query(
    `INSERT INTO matches (pool_id, season_cycle, home_user_id, away_user_id, status, environment_slug)
     VALUES (?, ?, ?, ?, 'scheduled', 'pluie')`,
    [pool.id, pool.current_cycle, user.id, bots[0].id]
  );

  await setHourDev(40);
  const scoutBefore = await generateScoutReport(user.id, pool.current_cycle, 'fr');
  assert(scoutBefore?.lockReason === 'no_recon', 'sans recon → no_recon');
  assert(scoutBefore.phase === 'none', 'phase none sans recon');

  await setHourDev(18);
  const fight = await startMatchmaking(user.id);
  assert(fight.missionId, 'mission de reconnaissance jouée');

  await setHourDev(40);
  const scoutH40 = await generateScoutReport(user.id, pool.current_cycle, 'fr');
  assert(scoutH40.phase === 'tendencies', 'tendances après recon');
  assert(scoutH40.historicalTendencies, 'historique présent');

  await setHourDev(55);
  const scoutH55 = await generateScoutReport(user.id, pool.current_cycle, 'fr');
  assert(scoutH55.phase === 'roster', 'roster après H54');
  assert(['partial', 'full'].includes(scoutH55.tier), `tier partial ou full (got ${scoutH55.tier})`);

  const match = await getUserMatchForCycle(user.id, pool.current_cycle);
  assert(match, 'match ligue');

  await deleteUserByUsername('playtest_scout_recon');
  console.log('\n=== test:scout-recon OK ===');
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
