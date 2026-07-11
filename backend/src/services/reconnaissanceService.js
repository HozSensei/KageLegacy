import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { getClockRow, getGameClock } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { simulateMatchCombat } from './combat/matchLoader.js';
import {
  applyPostMatchForMatch,
  persistSenseiChakra,
} from './combat/postMatch.js';
import { consumeUserItem } from './equipmentService.js';
import { persistTacticCardCombatUsage } from './tacticCards/tacticCardPersistence.js';
import { pickEnvironmentModifier } from './matchEnvironment.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { squadAveragePower } from './combat/squadPowerScaling.js';
import { grantReconnaissanceLoot } from './combatLootService.js';

export const RECON_MIN_HOUR = 0;
export const RECON_MAX_HOUR = 36;
/** Fourchettes indicatives — le tirage réel est dans combatLootService. */
export const RECON_WIN_RYOS = 500;
export const RECON_DRAW_RYOS = 250;
export const RECON_LOSS_RYOS = 80;
const POWER_TOLERANCE = 0.22;
const DIVISION_TOLERANCE = 1;

function mapWinnerToResult(winner) {
  if (winner === 'home') return 'home_win';
  if (winner === 'away') return 'away_win';
  return 'draw';
}

function outcomeForUser(result, userId, homeUserId) {
  if (result === 'draw') return 'draw';
  const homeWon = result === 'home_win';
  const isHome = userId === homeUserId;
  return homeWon === isHome ? 'win' : 'loss';
}

function serializeLootGrant(grant) {
  if (!grant) return null;
  return {
    ryos: grant.ryos ?? 0,
    items: grant.items ?? [],
    tacticCard: grant.tacticCard
      ? { slug: grant.tacticCard.slug, userTacticCardId: grant.tacticCard.userTacticCardId }
      : null,
  };
}

async function getUserSquadPower(userId) {
  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [userId]
  );
  return squadAveragePower(ninjas);
}

export async function assertReconnaissanceWindow() {
  const clock = await getGameClock();
  if (clock.hour < RECON_MIN_HOUR || clock.hour > RECON_MAX_HOUR) {
    const error = new Error(
      `Mission de reconnaissance disponible entre H${RECON_MIN_HOUR} et H${RECON_MAX_HOUR}.`
    );
    error.statusCode = 403;
    throw error;
  }
  return clock;
}

export async function hasPlayedReconThisCycle(userId, cycleStartAt) {
  const rows = await query(
    `SELECT id FROM reconnaissance_missions
     WHERE cycle_start_at = ? AND (home_user_id = ? OR away_user_id = ?)
     LIMIT 1`,
    [cycleStartAt, userId, userId]
  );
  return rows.length > 0;
}

async function assertBasicReconEligibility(userId, cycleStartAt) {
  const rows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  if (!rows[0] || rows[0].is_bot) {
    const error = new Error('Les bots ne participent pas aux missions de reconnaissance.');
    error.statusCode = 400;
    throw error;
  }
  if (await hasPlayedReconThisCycle(userId, cycleStartAt)) {
    const error = new Error('Vous avez déjà effectué une mission de reconnaissance ce cycle.');
    error.statusCode = 409;
    throw error;
  }
}

async function assertNoPendingReconChallenge(userId, cycleStartAt, { exceptChallengeId = null } = {}) {
  const params = [cycleStartAt, userId, userId];
  let sql = `SELECT id FROM reconnaissance_challenges
     WHERE cycle_start_at = ? AND status = 'pending'
       AND (challenger_user_id = ? OR defender_user_id = ?)`;
  if (exceptChallengeId) {
    sql += ' AND id != ?';
    params.push(exceptChallengeId);
  }
  sql += ' LIMIT 1';
  const pending = await query(sql, params);
  if (pending.length) {
    const error = new Error('Un défi de reconnaissance est en attente — réglez-le avant de lancer un combat.');
    error.statusCode = 409;
    throw error;
  }
}

async function assertEligibleParticipant(userId, cycleStartAt) {
  await assertBasicReconEligibility(userId, cycleStartAt);
  await assertNoPendingReconChallenge(userId, cycleStartAt);
}

async function loadSenseiName(userId) {
  const rows = await query('SELECT name FROM sensei WHERE user_id = ?', [userId]);
  return rows[0]?.name || 'Sensei';
}

export async function findMatchmakingOpponent(userId, cycleStartAt) {
  const pool = await findUserPool(userId);
  const divisionLevel = pool?.division_level ?? 5;
  const myPower = await getUserSquadPower(userId);
  if (!myPower) return null;

  const minDiv = Math.max(1, divisionLevel - DIVISION_TOLERANCE);
  const maxDiv = Math.min(5, divisionLevel + DIVISION_TOLERANCE);

  const candidates = await query(
    `SELECT u.id AS user_id,
            p.division_level,
            (SELECT AVG(n.taijutsu + n.ninjutsu + n.genjutsu + n.medecine + n.vitesse + n.intelligence)
             FROM ninjas n
             WHERE n.user_id = u.id AND n.squad_position IS NOT NULL) AS avg_power
     FROM users u
     JOIN pool_members pm ON pm.user_id = u.id
     JOIN pools p ON p.id = pm.pool_id
     WHERE u.is_bot = FALSE
       AND u.id != ?
       AND p.status = 'active'
       AND p.division_level BETWEEN ? AND ?
       AND NOT EXISTS (
         SELECT 1 FROM reconnaissance_missions rm
         WHERE rm.cycle_start_at = ?
           AND (rm.home_user_id = u.id OR rm.away_user_id = u.id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM reconnaissance_challenges rc
         WHERE rc.cycle_start_at = ?
           AND rc.status = 'pending'
           AND (rc.challenger_user_id = u.id OR rc.defender_user_id = u.id)
       )
     HAVING avg_power IS NOT NULL`,
    [userId, minDiv, maxDiv, cycleStartAt, cycleStartAt]
  );

  const filtered = candidates.filter((row) => {
    const power = Number(row.avg_power);
    if (!power) return false;
    const ratio = power / myPower;
    return ratio >= 1 - POWER_TOLERANCE && ratio <= 1 + POWER_TOLERANCE;
  });

  if (!filtered.length) return null;

  filtered.sort(
    (a, b) =>
      Math.abs(Number(a.avg_power) - myPower) - Math.abs(Number(b.avg_power) - myPower)
  );
  const top = filtered.slice(0, Math.min(12, filtered.length));
  return top[randomInt(top.length)];
}

export async function pickBotOpponent(userId, poolId) {
  const poolBots = await query(
    `SELECT u.id AS user_id
     FROM users u
     JOIN pool_members pm ON pm.user_id = u.id
     WHERE pm.pool_id = ? AND u.is_bot = TRUE
     ORDER BY u.id
     LIMIT 1`,
    [poolId]
  );
  if (poolBots[0]) return { userId: poolBots[0].user_id, isBot: true };

  const pool = await findUserPool(userId);
  const divisionLevel = pool?.division_level ?? 5;
  const fallback = await query(
    `SELECT u.id AS user_id
     FROM users u
     JOIN pool_members pm ON pm.user_id = u.id
     JOIN pools p ON p.id = pm.pool_id
     WHERE u.is_bot = TRUE AND p.status = 'active' AND p.division_level = ?
     ORDER BY RAND()
     LIMIT 1`,
    [divisionLevel]
  );
  if (fallback[0]) return { userId: fallback[0].user_id, isBot: true };
  return null;
}

async function notifyReconResult(userId, payload) {
  await createSenseiNotification(userId, 'reconnaissance_result', payload);
}

async function executeReconnaissanceFight({
  homeUserId,
  awayUserId,
  awayIsBot,
  source,
  challengeId = null,
  cycleStartAt,
}) {
  const env = pickEnvironmentModifier();
  const combat = await simulateMatchCombat(homeUserId, awayUserId, env.slug);

  for (const itemId of combat.consumedItemIds || []) {
    await consumeUserItem(itemId);
  }
  await persistTacticCardCombatUsage([combat.homeTeam, combat.awayTeam]);
  await persistSenseiChakra(homeUserId, combat.homeTeam.sensei.chakraPool);
  if (!awayIsBot) {
    await persistSenseiChakra(awayUserId, combat.awayTeam.sensei.chakraPool);
  }

  const result = mapWinnerToResult(combat.winner);
  const winnerUserId =
    result === 'home_win' ? homeUserId : result === 'away_win' ? awayUserId : null;

  const homeOutcome = outcomeForUser(result, homeUserId, homeUserId);
  const awayOutcome = outcomeForUser(result, awayUserId, homeUserId);

  const homeGrant = await grantReconnaissanceLoot(homeUserId, homeOutcome);
  const awayGrant = awayIsBot ? null : await grantReconnaissanceLoot(awayUserId, awayOutcome);
  const homeRyos = homeGrant.ryos;
  const awayRyos = awayGrant?.ryos ?? 0;
  const homeLoot = serializeLootGrant(homeGrant);
  const awayLoot = awayGrant ? serializeLootGrant(awayGrant) : null;

  const combatLogPayload = {
    logs: combat.logs,
    endReason: combat.endReason,
    homeScorePct: combat.homeScorePct,
    awayScorePct: combat.awayScorePct,
    koNinjaIds: combat.koNinjaIds,
    possession: combat.possession,
    equipmentSummary: combat.equipmentSummary,
    environment: combat.environment,
  };

  await applyPostMatchForMatch(homeUserId, awayUserId, combat.koNinjaIds || []);

  const insert = await query(
    `INSERT INTO reconnaissance_missions
       (cycle_start_at, home_user_id, away_user_id, away_is_bot, source, challenge_id,
        result, winner_user_id, environment_slug, combat_log,
        home_ryos, away_ryos, home_loot, away_loot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cycleStartAt,
      homeUserId,
      awayUserId,
      awayIsBot,
      source,
      challengeId,
      result,
      winnerUserId,
      env.slug,
      JSON.stringify(combatLogPayload),
      homeRyos,
      awayRyos,
      homeLoot ? JSON.stringify(homeLoot) : null,
      awayLoot ? JSON.stringify(awayLoot) : null,
    ]
  );

  const missionId = insert.insertId;
  const [homeName, awayName] = await Promise.all([
    loadSenseiName(homeUserId),
    loadSenseiName(awayUserId),
  ]);

  const summaryPayload = {
    missionId,
    result,
    homeSensei: homeName,
    awaySensei: awayName,
    awayIsBot,
    source,
    environmentSlug: env.slug,
    homeRyos,
    awayRyos,
    homeLoot,
    awayLoot,
    koCount: (combat.koNinjaIds || []).length,
  };

  await notifyReconResult(homeUserId, {
    ...summaryPayload,
    role: 'home',
    outcome: homeOutcome,
    opponentName: awayName,
    ryos: homeRyos,
  });
  if (!awayIsBot) {
    await notifyReconResult(awayUserId, {
      ...summaryPayload,
      role: 'away',
      outcome: awayOutcome,
      opponentName: homeName,
      ryos: awayRyos,
    });
  }

  return {
    missionId,
    result,
    winnerUserId,
    awayIsBot,
    source,
    environmentSlug: env.slug,
    homeRyos,
    awayRyos,
    homeLoot,
    awayLoot,
    combatLog: combatLogPayload,
    homeSensei: homeName,
    awaySensei: awayName,
  };
}

export async function startMatchmaking(userId) {
  await assertReconnaissanceWindow();
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow.cycle_start_at;
  await assertEligibleParticipant(userId, cycleStartAt);

  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune ligue active — impossible de lancer une reconnaissance.');
    error.statusCode = 404;
    throw error;
  }

  const opponent = await findMatchmakingOpponent(userId, cycleStartAt);
  if (opponent) {
    await assertEligibleParticipant(opponent.user_id, cycleStartAt);
    return executeReconnaissanceFight({
      homeUserId: userId,
      awayUserId: opponent.user_id,
      awayIsBot: false,
      source: 'matchmaking',
      cycleStartAt,
    });
  }

  const bot = await pickBotOpponent(userId, pool.id);
  if (!bot) {
    const error = new Error('Aucun adversaire disponible pour la reconnaissance.');
    error.statusCode = 503;
    throw error;
  }

  return executeReconnaissanceFight({
    homeUserId: userId,
    awayUserId: bot.userId,
    awayIsBot: true,
    source: 'matchmaking',
    cycleStartAt,
  });
}

export async function createChallenge(challengerId, defenderId) {
  await assertReconnaissanceWindow();
  if (challengerId === defenderId) {
    const error = new Error('Vous ne pouvez pas vous défier vous-même.');
    error.statusCode = 400;
    throw error;
  }

  const clockRow = await getClockRow();
  const cycleStartAt = clockRow.cycle_start_at;
  await assertEligibleParticipant(challengerId, cycleStartAt);
  await assertEligibleParticipant(defenderId, cycleStartAt);

  const defenderRows = await query('SELECT is_bot FROM users WHERE id = ?', [defenderId]);
  if (!defenderRows[0] || defenderRows[0].is_bot) {
    const error = new Error('Impossible de défier un bot.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await query(
    `SELECT id FROM reconnaissance_challenges
     WHERE cycle_start_at = ? AND challenger_user_id = ? AND defender_user_id = ?
       AND status = 'pending'`,
    [cycleStartAt, challengerId, defenderId]
  );
  if (existing.length) {
    const error = new Error('Un défi est déjà en attente pour cet adversaire.');
    error.statusCode = 409;
    throw error;
  }

  const insert = await query(
    `INSERT INTO reconnaissance_challenges
       (cycle_start_at, challenger_user_id, defender_user_id, status)
     VALUES (?, ?, ?, 'pending')`,
    [cycleStartAt, challengerId, defenderId]
  );

  const challengerName = await loadSenseiName(challengerId);
  await createSenseiNotification(defenderId, 'reconnaissance_challenge', {
    challengeId: insert.insertId,
    challengerUserId: challengerId,
    challengerName,
  });

  return {
    challengeId: insert.insertId,
    status: 'pending',
    challengerName,
  };
}

export async function acceptChallenge(challengeId, defenderId) {
  await assertReconnaissanceWindow();
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow.cycle_start_at;

  const rows = await query('SELECT * FROM reconnaissance_challenges WHERE id = ?', [challengeId]);
  const challenge = rows[0];
  if (!challenge) {
    const error = new Error('Défi introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (challenge.defender_user_id !== defenderId) {
    const error = new Error('Ce défi ne vous est pas destiné.');
    error.statusCode = 403;
    throw error;
  }
  if (challenge.status !== 'pending') {
    const error = new Error('Ce défi n\'est plus disponible.');
    error.statusCode = 409;
    throw error;
  }
  if (new Date(challenge.cycle_start_at).getTime() !== new Date(cycleStartAt).getTime()) {
    await query(
      `UPDATE reconnaissance_challenges SET status = 'expired', responded_at = UTC_TIMESTAMP() WHERE id = ?`,
      [challengeId]
    );
    const error = new Error('Ce défi a expiré (nouveau cycle).');
    error.statusCode = 410;
    throw error;
  }

  await assertBasicReconEligibility(challenge.challenger_user_id, cycleStartAt);
  await assertBasicReconEligibility(defenderId, cycleStartAt);
  await assertNoPendingReconChallenge(challenge.challenger_user_id, cycleStartAt, {
    exceptChallengeId: challengeId,
  });
  await assertNoPendingReconChallenge(defenderId, cycleStartAt, { exceptChallengeId: challengeId });

  const fight = await executeReconnaissanceFight({
    homeUserId: challenge.challenger_user_id,
    awayUserId: defenderId,
    awayIsBot: false,
    source: 'challenge',
    challengeId,
    cycleStartAt,
  });

  await query(
    `UPDATE reconnaissance_challenges
     SET status = 'accepted', responded_at = UTC_TIMESTAMP(), mission_id = ?
     WHERE id = ?`,
    [fight.missionId, challengeId]
  );

  return fight;
}

export async function declineChallenge(challengeId, defenderId) {
  await assertReconnaissanceWindow();
  const rows = await query('SELECT * FROM reconnaissance_challenges WHERE id = ?', [challengeId]);
  const challenge = rows[0];
  if (!challenge) {
    const error = new Error('Défi introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (challenge.defender_user_id !== defenderId) {
    const error = new Error('Ce défi ne vous est pas destiné.');
    error.statusCode = 403;
    throw error;
  }
  if (challenge.status !== 'pending') {
    const error = new Error('Ce défi n\'est plus disponible.');
    error.statusCode = 409;
    throw error;
  }

  await query(
    `UPDATE reconnaissance_challenges SET status = 'declined', responded_at = UTC_TIMESTAMP() WHERE id = ?`,
    [challengeId]
  );
  return { challengeId, status: 'declined' };
}

export async function listExternalOpponents(userId, limit = 20) {
  const pool = await findUserPool(userId);
  if (!pool) return [];

  const clockRow = await getClockRow();
  const cycleStartAt = clockRow.cycle_start_at;
  const divisionLevel = pool.division_level;
  const minDiv = Math.max(1, divisionLevel - DIVISION_TOLERANCE);
  const maxDiv = Math.min(5, divisionLevel + DIVISION_TOLERANCE);

  const rows = await query(
    `SELECT u.id AS userId, s.name AS senseiName, p.division_level AS divisionLevel,
            p.id AS poolId, p.season_number AS seasonNumber
     FROM users u
     JOIN sensei s ON s.user_id = u.id
     JOIN pool_members pm ON pm.user_id = u.id
     JOIN pools p ON p.id = pm.pool_id
     WHERE u.is_bot = FALSE
       AND u.id != ?
       AND p.status = 'active'
       AND p.division_level BETWEEN ? AND ?
       AND NOT EXISTS (
         SELECT 1 FROM reconnaissance_missions rm
         WHERE rm.cycle_start_at = ?
           AND (rm.home_user_id = u.id OR rm.away_user_id = u.id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM reconnaissance_challenges rc
         WHERE rc.cycle_start_at = ?
           AND rc.status = 'pending'
           AND (rc.challenger_user_id = u.id OR rc.defender_user_id = u.id)
       )
     ORDER BY p.division_level ASC, s.name ASC
     LIMIT ?`,
    [userId, minDiv, maxDiv, cycleStartAt, cycleStartAt, limit]
  );

  return rows.map((row) => ({
    userId: row.userId,
    senseiName: row.senseiName,
    divisionLevel: row.divisionLevel,
    poolId: row.poolId,
    seasonNumber: row.seasonNumber,
    samePool: row.poolId === pool.id,
  }));
}

function parseJsonField(value) {
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function formatMissionRow(row, userId) {
  if (!row) return null;
  const isHome = row.home_user_id === userId;
  const outcome = outcomeForUser(row.result, userId, row.home_user_id);
  return {
    missionId: row.id,
    result: row.result,
    outcome,
    source: row.source,
    awayIsBot: Boolean(row.away_is_bot),
    environmentSlug: row.environment_slug,
    ryos: isHome ? row.home_ryos : row.away_ryos,
    loot: parseJsonField(isHome ? row.home_loot : row.away_loot),
    opponentUserId: isHome ? row.away_user_id : row.home_user_id,
    role: isHome ? 'home' : 'away',
    createdAt: row.created_at,
  };
}

export async function getReconnaissanceState(userId) {
  const clock = await getGameClock();
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at ?? null;
  const available =
    clock.hour >= RECON_MIN_HOUR && clock.hour <= RECON_MAX_HOUR && Boolean(cycleStartAt);

  let played = false;
  let lastMission = null;
  let pendingIncoming = [];
  let pendingOutgoing = null;

  if (cycleStartAt) {
    played = await hasPlayedReconThisCycle(userId, cycleStartAt);

    const missionRows = await query(
      `SELECT rm.*, hs.name AS home_sensei, aws.name AS away_sensei
       FROM reconnaissance_missions rm
       JOIN sensei hs ON hs.user_id = rm.home_user_id
       JOIN sensei aws ON aws.user_id = rm.away_user_id
       WHERE rm.cycle_start_at = ?
         AND (rm.home_user_id = ? OR rm.away_user_id = ?)
       ORDER BY rm.created_at DESC
       LIMIT 1`,
      [cycleStartAt, userId, userId]
    );
    if (missionRows[0]) {
      const row = missionRows[0];
      const formatted = formatMissionRow(row, userId);
      lastMission = {
        ...formatted,
        homeSensei: row.home_sensei,
        awaySensei: row.away_sensei,
        opponentName: formatted.role === 'home' ? row.away_sensei : row.home_sensei,
      };
    }

    const incoming = await query(
      `SELECT rc.*, s.name AS challenger_name
       FROM reconnaissance_challenges rc
       JOIN sensei s ON s.user_id = rc.challenger_user_id
       WHERE rc.cycle_start_at = ? AND rc.defender_user_id = ? AND rc.status = 'pending'
       ORDER BY rc.created_at ASC`,
      [cycleStartAt, userId]
    );
    pendingIncoming = incoming.map((row) => ({
      challengeId: row.id,
      challengerUserId: row.challenger_user_id,
      challengerName: row.challenger_name,
      createdAt: row.created_at,
    }));

    const outgoing = await query(
      `SELECT rc.*, s.name AS defender_name
       FROM reconnaissance_challenges rc
       JOIN sensei s ON s.user_id = rc.defender_user_id
       WHERE rc.cycle_start_at = ? AND rc.challenger_user_id = ? AND rc.status = 'pending'
       ORDER BY rc.created_at DESC
       LIMIT 1`,
      [cycleStartAt, userId]
    );
    if (outgoing[0]) {
      pendingOutgoing = {
        challengeId: outgoing[0].id,
        defenderUserId: outgoing[0].defender_user_id,
        defenderName: outgoing[0].defender_name,
        createdAt: outgoing[0].created_at,
      };
    }
  }

  return {
    available,
    hour: clock.hour,
    phase: clock.phase,
    played,
    pendingIncoming,
    pendingOutgoing,
    lastMission,
    rewards: {
      winRyos: RECON_WIN_RYOS,
      drawRyos: RECON_DRAW_RYOS,
      lossRyos: RECON_LOSS_RYOS,
      includesItem: true,
      includesTacticCardChance: true,
    },
  };
}
