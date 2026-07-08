#!/usr/bin/env node
/**
 * Playtest ligue : 2 humains dans la même pool via invitePoolId, match H71 simulé.
 * Usage: npm run playtest:league
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { upsertClanTraits, findAllClanTraits } from '../src/models/clanTrait.js';
import { createNinja } from '../src/models/ninja.js';
import { registerUser } from '../src/services/authService.js';
import { processCycleTick } from '../src/services/cycleJobs.js';
import { getClockRow, setHourDev, getGameClock } from '../src/services/gameClock.js';
import { findUserPool, joinOrCreatePool } from '../src/services/poolService.js';
import { distributeCharacterTraits, generateNinjaProfile } from '../src/services/ninjaGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = process.env.PLAYTEST_API_URL || `http://localhost:${process.env.PORT || 3000}`;
const PASSWORD = 'playtest123';

const DEFAULT_CLANS = [
  { name: 'Roturier', intelligence_bonus: 0, speed_bonus: 0, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: false },
  { name: 'Nara', intelligence_bonus: 4, speed_bonus: -2, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: true },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function ensureClans() {
  const existing = await findAllClanTraits();
  if (existing.length) return existing;
  await upsertClanTraits(DEFAULT_CLANS);
  return findAllClanTraits();
}

async function deleteUserByUsername(username) {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (!rows[0]) return;
  const userId = rows[0].id;
  await query('DELETE FROM matches WHERE home_user_id = ? OR away_user_id = ?', [userId, userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function cleanupPlaytestLeagueUsers() {
  const users = await query('SELECT id FROM users WHERE username LIKE ?', ['playtest_lg_%']);
  if (!users.length) return;
  const ids = users.map((u) => u.id);
  const ph = ids.map(() => '?').join(',');
  await query(
    `DELETE FROM matches WHERE home_user_id IN (${ph}) OR away_user_id IN (${ph})`,
    [...ids, ...ids]
  );
  await query(`DELETE FROM users WHERE id IN (${ph})`, ids);
}

async function ensurePoolWithBotSlot(userId) {
  let userPool = await findUserPool(userId);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const bots = await query(
      `SELECT u.id FROM pool_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.pool_id = ? AND u.is_bot = TRUE
       LIMIT 1`,
      [userPool.id]
    );
    if (bots.length) return userPool;

    await query('DELETE FROM pool_members WHERE pool_id = ? AND user_id = ?', [userPool.id, userId]);
    await query('DELETE FROM pool_standings WHERE pool_id = ? AND user_id = ?', [userPool.id, userId]);
    userPool = await joinOrCreatePool(userId);
  }
  throw new Error('Impossible de trouver une pool avec slot bot pour le playtest ligue.');
}

async function resetCycleJobs() {
  const row = await getClockRow();
  if (row?.cycle_start_at) {
    await query('DELETE FROM cycle_job_runs WHERE cycle_start_at = ?', [row.cycle_start_at]);
  }
}

async function createActiveSquad(userId, clans) {
  const traits = distributeCharacterTraits(3);
  for (let i = 0; i < 3; i += 1) {
    const profile = await generateNinjaProfile({
      clans,
      grade: 'Genin',
      characterTrait: traits[i],
      language: 'fr',
    });
    await createNinja({ user_id: userId, ...profile, squad_position: i + 1 });
  }
}

async function findHeadToHeadMatch(poolId, userAId, userBId) {
  const rows = await query(
    `SELECT * FROM matches
     WHERE pool_id = ? AND status = 'scheduled'
       AND (
         (home_user_id = ? AND away_user_id = ?)
         OR (home_user_id = ? AND away_user_id = ?)
       )
     ORDER BY season_cycle ASC
     LIMIT 1`,
    [poolId, userAId, userBId, userBId, userAId]
  );
  return rows[0] || null;
}

async function registerPlayerB({ username, password, senseiName, invitePoolId }) {
  try {
    const health = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (health.ok) {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          senseiName,
          language: 'fr',
          invitePoolId,
        }),
      });
      const body = await res.json();
      if (res.ok && body.pool?.id === invitePoolId && !body.pool?.inviteFallback) {
        const rows = await query('SELECT id, username FROM users WHERE username = ? LIMIT 1', [
          username,
        ]);
        return { user: rows[0], viaHttp: true };
      }
      if (res.ok) {
        await deleteUserByUsername(username);
      }
    }
  } catch {
    /* API hors ligne ou register HTTP non compatible */
  }

  const { user, poolJoin } = await registerUser({
    username,
    password,
    senseiName,
    language: 'fr',
    invitePoolId,
  });
  assert(!poolJoin.fallback, `Invitation échouée : ${poolJoin.reason}`);
  return { user, viaHttp: false };
}

async function main() {
  const tag = Date.now();
  const usernameA = `playtest_lg_a_${tag}`;
  const usernameB = `playtest_lg_b_${tag}`;

  console.log('\n🏆 Kage Legacy — playtest ligue (2 humains, match H71)\n');

  await cleanupPlaytestLeagueUsers();
  await resetCycleJobs();
  const clans = await ensureClans();

  const { user: userA } = await registerUser({
    username: usernameA,
    password: PASSWORD,
    senseiName: 'Sensei Alpha',
    language: 'fr',
  });
  const poolA = await ensurePoolWithBotSlot(userA.id);
  assert(poolA?.id, 'Pool A introuvable après inscription');

  const { user: userB, viaHttp } = await registerPlayerB({
    username: usernameB,
    password: PASSWORD,
    senseiName: 'Sensei Beta',
    invitePoolId: poolA.id,
  });

  const poolB = await findUserPool(userB.id);
  assert(poolB?.id === poolA.id, 'Les deux joueurs ne sont pas dans la même pool');

  console.log(
    `✅ Pool #${poolA.id} — ${usernameA} + ${usernameB} (invitePoolId${viaHttp ? ', HTTP' : ''})`
  );

  await createActiveSquad(userA.id, clans);
  await createActiveSquad(userB.id, clans);
  console.log('✅ Escouades actives (3 ninjas × 2)');

  const duel = await findHeadToHeadMatch(poolA.id, userA.id, userB.id);
  assert(duel, 'Aucun match programmé entre les deux joueurs');

  await query('UPDATE pools SET current_cycle = ? WHERE id = ?', [duel.season_cycle, poolA.id]);
  console.log(
    `✅ Journée ${duel.season_cycle} — match #${duel.id} (${duel.home_user_id === userA.id ? 'A domicile' : 'B domicile'})`
  );

  await setHourDev(70);
  await processCycleTick();

  await setHourDev(71);
  const h71 = await processCycleTick();
  console.log('\n  Tick H71:', h71?.actions?.length ? 'simulation matchs' : JSON.stringify(h71));

  const matchAfter = (
    await query('SELECT * FROM matches WHERE id = ?', [duel.id])
  )[0];
  assert(matchAfter, 'Match introuvable après H71');
  assert(
    ['revealing', 'applied', 'simulated'].includes(matchAfter.status),
    `Match non simulé (status=${matchAfter.status})`
  );
  assert(matchAfter.combat_log, 'combat_log manquant');
  assert(
    matchAfter.home_user_id === userA.id || matchAfter.home_user_id === userB.id,
    'Match ne concerne pas les joueurs playtest'
  );

  const clock = await getGameClock();
  console.log(`\n── Résultat H${clock.hour} ──`);
  console.log(`  Match #${matchAfter.id} · ${matchAfter.result}`);
  console.log(`  Score ${matchAfter.home_score}–${matchAfter.away_score} · tours fin ${matchAfter.ending_tour}`);

  await cleanupPlaytestLeagueUsers();
  console.log('\n✅ Playtest ligue terminé (comptes éphémères supprimés).\n');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await cleanupPlaytestLeagueUsers();
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
