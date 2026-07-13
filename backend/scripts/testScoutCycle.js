#!/usr/bin/env node
/**
 * Test cycle espionnage : tendances H36, gel H54, lien reconnaissance, snapshot figé.
 * Usage: npm run test:scout-cycle
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { registerUser } from '../src/services/authService.js';
import { setHourDev, advanceToHourDev, getClockRow } from '../src/services/gameClock.js';
import { joinOrCreatePool, findUserPool } from '../src/services/poolService.js';
import { startMatchmaking } from '../src/services/reconnaissanceService.js';
import { runH36, runH71 } from '../src/services/cycleJobs.js';
import {
  buildHistoricalTendencies,
  buildSquadSnapshotFromNinjas,
  computeReliability,
  generateTendenciesIntelForUser,
} from '../src/services/scoutIntelService.js';
import {
  buildAndPersistRosterIntel,
  generateScoutReport,
} from '../src/services/scouting.js';
import { getUserMatchForCycle } from '../src/services/matchService.js';
import { isCompositionLocked } from '../src/services/gameClock.js';
import { saveOperationDeck } from '../src/services/operationDeckService.js';

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

async function createUser(username) {
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

async function findPoolOpponent(poolId, userId) {
  const rows = await query(
    `SELECT u.id FROM users u
     JOIN pool_members pm ON pm.user_id = u.id
     WHERE pm.pool_id = ? AND u.id != ?
     LIMIT 1`,
    [poolId, userId]
  );
  return rows[0]?.id ?? null;
}

async function seedMatch(poolId, homeId, awayId, cycle, combatLog = null) {
  await query(
    `INSERT INTO matches (pool_id, season_cycle, home_user_id, away_user_id, status, result, combat_log, results_applied_at)
     VALUES (?, ?, ?, ?, 'applied', 'home_win', ?, UTC_TIMESTAMP())`,
    [poolId, cycle, homeId, awayId, combatLog ? JSON.stringify(combatLog) : null]
  );
}

async function main() {
  console.log('=== Test cycle espionnage H36/H54 ===\n');

  assert(computeReliability(0) === 'none', 'reliability none');
  assert(computeReliability(1) === 'very_low', 'reliability very_low');
  assert(computeReliability(2) === 'low', 'reliability low');

  const tendencies = buildHistoricalTendencies(
    99,
    [
      {
        home_user_id: 99,
        combat_log: {
          squadSnapshots: {
            home: [
              { element_affinity: 'Katon', primaryArt: 'ninjutsu', speed: 50 },
              { element_affinity: 'Katon', primaryArt: 'ninjutsu', speed: 48 },
              { element_affinity: 'Katon', primaryArt: 'taijutsu', speed: 42 },
            ],
          },
        },
      },
    ],
    'fr'
  );
  assert(tendencies.sampleSize === 1, 'sample size 1');
  assert(tendencies.lines[0].includes('1 match'), 'mention sample size');
  assert(tendencies.lines[0].includes('peu fiable') || tendencies.lines[0].includes('première'), 'low reliability');

  const user = await createUser('playtest_scout_cycle');
  const userPool = await findUserPool(user.id);
  assert(userPool, 'pool');

  const opponentId = await findPoolOpponent(userPool.id, user.id);
  assert(opponentId, 'adversaire dans le pool');

  await query(
    `INSERT INTO matches (pool_id, season_cycle, home_user_id, away_user_id, status, environment_slug)
     VALUES (?, ?, ?, ?, 'scheduled', 'pluie')`,
    [userPool.id, userPool.current_cycle, user.id, opponentId]
  );

  const snapshot = buildSquadSnapshotFromNinjas(
    [
      {
        id: 1,
        element_affinity: 'Katon',
        taijutsu: 5,
        ninjutsu: 8,
        genjutsu: 4,
        medecine: 3,
        vitesse: 20,
        intelligence: 15,
        grade: 'Chunin',
      },
    ],
    'fr'
  );
  assert(snapshot[0].primaryArt === 'ninjutsu', 'snapshot art');

  await seedMatch(userPool.id, opponentId, user.id, Math.max(1, userPool.current_cycle - 1), {
    squadSnapshots: {
      home: snapshot,
      away: snapshot,
    },
  });

  await setHourDev(18);
  await advanceToHourDev(40);
  const scoutBeforeRecon = await generateScoutReport(user.id, userPool.current_cycle, 'fr');
  assert(scoutBeforeRecon?.lockReason === 'no_recon', 'sans recon → no_recon');
  assert(scoutBeforeRecon.phase === 'none', 'phase none sans recon');

  await setHourDev(18);
  const reg = await startMatchmaking(user.id);
  assert(reg.status === 'queued', 'inscription reconnaissance');

  await advanceToHourDev(36);
  const clockRow = await getClockRow();
  await query(
    `DELETE FROM cycle_job_runs WHERE cycle_start_at = ? AND job_name = 'h36'`,
    [clockRow.cycle_start_at]
  );
  await runH36(clockRow.cycle_start_at);

  await advanceToHourDev(40);
  const tendenciesIntel = await generateTendenciesIntelForUser(user.id, userPool.current_cycle, 'fr');
  assert(tendenciesIntel?.sampleSize >= 0, 'tendances générées');

  const scoutH40 = await generateScoutReport(user.id, userPool.current_cycle, 'fr');
  assert(scoutH40.phase === 'tendencies', 'phase tendencies à H40');
  assert(scoutH40.rosterPending, 'roster pending avant H54');
  assert(scoutH40.historicalTendencies?.lines?.length >= 1, 'lignes tendances');

  await advanceToHourDev(55);
  assert(await isCompositionLocked(), 'composition locked H55');

  const rosterIntel = await buildAndPersistRosterIntel(user.id, userPool.current_cycle, 'fr');
  assert(rosterIntel?.lines?.length >= 1, 'rapport roster persisté');

  const scoutH55 = await generateScoutReport(user.id, userPool.current_cycle, 'fr');
  assert(scoutH55.phase === 'roster', 'phase roster à H55');
  assert(['partial', 'full'].includes(scoutH55.tier), `tier partial ou full (got ${scoutH55.tier})`);
  assert(scoutH55.rosterFrozen, 'snapshot figé');
  assert(await getUserMatchForCycle(user.id, userPool.current_cycle), 'match ligue');

  await query(
    `UPDATE ninjas SET taijutsu = taijutsu + 5 WHERE user_id = ? AND squad_position IS NOT NULL`,
    [opponentId]
  );
  const scoutAfterOpponentChange = await generateScoutReport(user.id, userPool.current_cycle, 'fr');
  assert(
    JSON.stringify(scoutAfterOpponentChange.rosterReport) === JSON.stringify(scoutH55.rosterReport),
    'rapport roster inchangé après modification adverse post-H54'
  );

  const scoutH60 = await generateScoutReport(user.id, userPool.current_cycle, 'fr');
  assert(
    JSON.stringify(scoutH60.rosterReport) === JSON.stringify(scoutH55.rosterReport),
    'rapport stable entre H55 et H60'
  );

  const oppNinjas = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [opponentId]
  );
  assert(oppNinjas.length >= 1, 'ninjas adverses pour deck');
  await saveOperationDeck(opponentId, {
    techniqueSlotsByNinjaId: {},
  });

  await advanceToHourDev(71);
  const clockH71 = await getClockRow();
  await query(`DELETE FROM cycle_job_runs WHERE cycle_start_at = ? AND job_name = 'h71'`, [
    clockH71.cycle_start_at,
  ]);
  await runH71(clockH71.cycle_start_at);

  const scoutH71 = await generateScoutReport(user.id, userPool.current_cycle, 'fr');
  assert(scoutH71.deckFrozen, 'deck figé à H71');
  assert(scoutH71.deckReport?.lines?.length >= 1, 'rapport deck adverse');
  const deckLinesFrozen = [...(scoutH71.deckReport?.lines || [])];

  let deckSaveRejected = false;
  try {
    await saveOperationDeck(opponentId, {
      techniquesByNinjaId: Object.fromEntries(
        oppNinjas.map((n) => [n.id, { primary: 'taijutsu', secondary: 'genjutsu' }])
      ),
      elementCardIds: [],
    });
  } catch {
    deckSaveRejected = true;
  }
  assert(deckSaveRejected, 'deck adverse verrouillé à H71');

  const scoutAfterDeckChange = await generateScoutReport(user.id, userPool.current_cycle, 'fr');
  assert(
    JSON.stringify(scoutAfterDeckChange.deckReport?.lines) === JSON.stringify(deckLinesFrozen),
    'rapport deck inchangé après tentative de modification adverse post-H71'
  );

  await deleteUserByUsername('playtest_scout_cycle');
  console.log('\n=== test:scout-cycle OK ===');
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
