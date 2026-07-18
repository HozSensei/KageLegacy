/**
 * Villages C0 — score solo + rivalité de cycle (sans bonus combat).
 */

import { query } from '../config/database.js';
import { getGameClock } from './gameClock.js';
import { findUserPool } from './poolService.js';

export const VILLAGE_IDS = ['leaf', 'sand', 'mist', 'stone'];

export const VILLAGE_ACTIONS = {
  daily_seal: 1,
  mission_assign: 2,
  mission_c_plus_success: 4,
  recon_win: 5,
  recon_participate: 2,
  league_win: 6,
  league_participate: 2,
  chunin_success: 4,
  bird_flight_success: 8,
};

export const VILLAGE_CAP_PER_CYCLE = 40;
export const VILLAGE_REWARD_RYOS = 150;
export const VILLAGE_REWARD_MIN_POINTS = 3;

const RIVALRY_PAIRS = [
  ['leaf', 'sand'],
  ['mist', 'stone'],
  ['leaf', 'mist'],
  ['sand', 'stone'],
  ['leaf', 'stone'],
  ['sand', 'mist'],
];

export function isValidVillageId(villageId) {
  return VILLAGE_IDS.includes(villageId);
}

export function pickRivalryPair(seed) {
  const index = Math.abs(Number(seed) || 0) % RIVALRY_PAIRS.length;
  const [village_a, village_b] = RIVALRY_PAIRS[index];
  return { village_a, village_b };
}

async function getCycleStartAt() {
  const clock = await getGameClock();
  return clock.cycleStartAt;
}

async function getUserContribution(userId, cycleStartAt) {
  const rows = await query(
    `SELECT COALESCE(SUM(points), 0) AS pts
     FROM village_score_events
     WHERE user_id = ? AND cycle_start_at = ?`,
    [userId, cycleStartAt]
  );
  return Number(rows[0]?.pts || 0);
}

/**
 * Enregistre des points village (plafonnés). Fire-and-forget safe : ne throw pas vers l'appelant métier.
 */
export async function recordVillageScore(userId, actionKey) {
  try {
    const points = VILLAGE_ACTIONS[actionKey];
    if (!points || !userId) return { recorded: false, reason: 'invalid' };

    const senseiRows = await query(
      `SELECT s.village_id, u.is_bot
       FROM sensei s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = ?`,
      [userId]
    );
    if (!senseiRows[0] || senseiRows[0].is_bot) {
      return { recorded: false, reason: 'no_village' };
    }
    const villageId = senseiRows[0].village_id;

    const cycleStartAt = await getCycleStartAt();
    const already = await getUserContribution(userId, cycleStartAt);
    if (already >= VILLAGE_CAP_PER_CYCLE) {
      return { recorded: false, reason: 'capped', contribution: already };
    }

    const granted = Math.min(points, VILLAGE_CAP_PER_CYCLE - already);
    if (granted <= 0) return { recorded: false, reason: 'capped', contribution: already };

    await query(
      `INSERT INTO village_score_events (user_id, village_id, cycle_start_at, action_key, points)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, villageId, cycleStartAt, actionKey, granted]
    );
    await query(
      `INSERT INTO village_cycle_totals (village_id, cycle_start_at, points)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE points = points + VALUES(points)`,
      [villageId, cycleStartAt, granted]
    );

    return {
      recorded: true,
      villageId,
      actionKey,
      points: granted,
      contribution: already + granted,
    };
  } catch (error) {
    console.error('[village] recordVillageScore failed', actionKey, error.message);
    return { recorded: false, reason: 'error', error: error.message };
  }
}

export async function ensureCycleRivalry(cycleStartAt = null) {
  const start = cycleStartAt || (await getCycleStartAt());
  const existing = await query(
    'SELECT cycle_start_at, village_a, village_b, winner_village_id FROM village_rivalries WHERE cycle_start_at = ?',
    [start]
  );
  if (existing[0]) return existing[0];

  const pools = await query(
    `SELECT season_number, current_cycle FROM pools WHERE status = 'active' LIMIT 1`
  );
  const seasonNumber = Number(pools[0]?.season_number || 1);
  const currentCycle = Number(pools[0]?.current_cycle || 1);
  const seed = seasonNumber * 10 + currentCycle;
  const pair = pickRivalryPair(seed);

  await query(
    `INSERT INTO village_rivalries (cycle_start_at, village_a, village_b)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE village_a = village_a`,
    [start, pair.village_a, pair.village_b]
  );

  return {
    cycle_start_at: start,
    village_a: pair.village_a,
    village_b: pair.village_b,
    winner_village_id: null,
  };
}

export async function resolveCycleRivalry(cycleStartAt = null) {
  const start = cycleStartAt || (await getCycleStartAt());
  const rivalry = await ensureCycleRivalry(start);
  if (rivalry.winner_village_id) {
    return { alreadyResolved: true, rivalry };
  }

  const totals = await query(
    `SELECT village_id, points FROM village_cycle_totals WHERE cycle_start_at = ?`,
    [start]
  );
  const byId = Object.fromEntries(totals.map((r) => [r.village_id, Number(r.points)]));
  const scoreA = byId[rivalry.village_a] || 0;
  const scoreB = byId[rivalry.village_b] || 0;

  let winner = null;
  if (scoreA > scoreB) winner = rivalry.village_a;
  else if (scoreB > scoreA) winner = rivalry.village_b;

  await query(
    `UPDATE village_rivalries
     SET winner_village_id = ?, resolved_at = UTC_TIMESTAMP()
     WHERE cycle_start_at = ?`,
    [winner, start]
  );

  const rewardedUserIds = [];
  if (winner) {
      const title = `rivalry:${winner}`;
      const contributors = await query(
      `SELECT user_id, SUM(points) AS pts
       FROM village_score_events
       WHERE village_id = ? AND cycle_start_at = ?
       GROUP BY user_id
       HAVING pts >= ?`,
      [winner, start, VILLAGE_REWARD_MIN_POINTS]
    );

    for (const row of contributors) {
      await query('UPDATE sensei SET ryos = ryos + ?, village_title = ? WHERE user_id = ?', [
        VILLAGE_REWARD_RYOS,
        title,
        row.user_id,
      ]);
      rewardedUserIds.push(row.user_id);
    }
  }

  return {
    alreadyResolved: false,
    rivalry: { ...rivalry, winner_village_id: winner },
    scoreA,
    scoreB,
    rewardedUserIds,
    rewardRyos: winner ? VILLAGE_REWARD_RYOS : 0,
  };
}

export async function canRetakeVillage(userId) {
  const senseiRows = await query(
    `SELECT village_id, village_retake_used FROM sensei WHERE user_id = ?`,
    [userId]
  );
  const sensei = senseiRows[0];
  if (!sensei) return { allowed: false, reason: 'no_sensei' };
  if (sensei.village_retake_used) return { allowed: false, reason: 'retake_used' };

  const pool = await findUserPool(userId);
  const seasonCycle = pool?.current_cycle ?? 1;
  if (seasonCycle > 2) return { allowed: false, reason: 'too_late' };

  const cycleStartAt = await getCycleStartAt();
  const contribution = await getUserContribution(userId, cycleStartAt);
  if (contribution > 0) return { allowed: false, reason: 'already_scored' };

  return { allowed: true, villageId: sensei.village_id };
}

export async function retakeVillage(userId, villageId) {
  if (!isValidVillageId(villageId)) {
    const error = new Error('Village invalide.');
    error.statusCode = 400;
    throw error;
  }
  const gate = await canRetakeVillage(userId);
  if (!gate.allowed) {
    const error = new Error('Changement de village indisponible.');
    error.statusCode = 400;
    error.code = gate.reason;
    throw error;
  }
  if (gate.villageId === villageId) {
    return getVillagePayload(userId);
  }

  await query(
    `UPDATE sensei SET village_id = ?, village_retake_used = 1 WHERE user_id = ?`,
    [villageId, userId]
  );
  return getVillagePayload(userId);
}

export async function getVillagePayload(userId) {
  const cycleStartAt = await getCycleStartAt();
  await ensureCycleRivalry(cycleStartAt);

  const senseiRows = await query(
    `SELECT village_id, village_retake_used, village_title, ryos
     FROM sensei WHERE user_id = ?`,
    [userId]
  );
  const sensei = senseiRows[0];
  if (!sensei) return null;

  const totals = await query(
    `SELECT village_id, points FROM village_cycle_totals WHERE cycle_start_at = ?`,
    [cycleStartAt]
  );
  const cycleScores = Object.fromEntries(
    VILLAGE_IDS.map((id) => [id, 0])
  );
  for (const row of totals) {
    cycleScores[row.village_id] = Number(row.points);
  }

  const seasonRows = await query(
    `SELECT village_id, SUM(points) AS pts
     FROM village_cycle_totals
     GROUP BY village_id`
  );
  const seasonScores = Object.fromEntries(VILLAGE_IDS.map((id) => [id, 0]));
  for (const row of seasonRows) {
    seasonScores[row.village_id] = Number(row.pts);
  }

  const rivalryRows = await query(
    `SELECT village_a, village_b, winner_village_id, resolved_at
     FROM village_rivalries WHERE cycle_start_at = ?`,
    [cycleStartAt]
  );
  const rivalry = rivalryRows[0] || null;

  const contribution = await getUserContribution(userId, cycleStartAt);
  const retake = await canRetakeVillage(userId);

  const standings = VILLAGE_IDS.map((id) => ({
    villageId: id,
    cyclePoints: cycleScores[id],
    seasonPoints: seasonScores[id],
  })).sort((a, b) => b.cyclePoints - a.cyclePoints || b.seasonPoints - a.seasonPoints);

  const topContributors = await query(
    `SELECT e.user_id AS userId, s.name AS senseiName, SUM(e.points) AS points
     FROM village_score_events e
     JOIN sensei s ON s.user_id = e.user_id
     WHERE e.village_id = ? AND e.cycle_start_at = ?
     GROUP BY e.user_id, s.name
     ORDER BY points DESC
     LIMIT 5`,
    [sensei.village_id, cycleStartAt]
  );

  return {
    villageId: sensei.village_id,
    villageTitle: sensei.village_title || null,
    retakeUsed: Boolean(sensei.village_retake_used),
    canRetake: retake.allowed,
    contribution,
    cap: VILLAGE_CAP_PER_CYCLE,
    rewardRyos: VILLAGE_REWARD_RYOS,
    rewardMinPoints: VILLAGE_REWARD_MIN_POINTS,
    actions: Object.entries(VILLAGE_ACTIONS).map(([key, points]) => ({ key, points })),
    standings,
    rivalry: rivalry
      ? {
          villageA: rivalry.village_a,
          villageB: rivalry.village_b,
          winnerVillageId: rivalry.winner_village_id,
          resolved: Boolean(rivalry.resolved_at || rivalry.winner_village_id),
          scoreA: cycleScores[rivalry.village_a] || 0,
          scoreB: cycleScores[rivalry.village_b] || 0,
        }
      : null,
    topContributors: topContributors.map((r) => ({
      userId: r.userId,
      senseiName: r.senseiName,
      points: Number(r.points),
    })),
    cycleStartAt,
  };
}

export async function getVillageBanner(userId) {
  const payload = await getVillagePayload(userId);
  if (!payload?.rivalry) return null;
  const { rivalry, villageId } = payload;
  return {
    villageId,
    villageA: rivalry.villageA,
    villageB: rivalry.villageB,
    scoreA: rivalry.scoreA,
    scoreB: rivalry.scoreB,
    resolved: rivalry.resolved,
    winnerVillageId: rivalry.winnerVillageId,
  };
}
