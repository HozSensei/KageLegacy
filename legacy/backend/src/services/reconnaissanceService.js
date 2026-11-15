import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { getClockRow, getGameClock } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { simulateMatchCombat, loadTeamForCombat } from './combat/matchLoader.js';
import {
  applyPostMatchForMatch,
  persistSenseiChakra,
} from './combat/postMatch.js';
import { consumeUserItem } from './equipmentService.js';
import { persistTacticCardCombatUsage } from './tacticCards/tacticCardPersistence.js';
import { pickEnvironmentModifier } from './matchEnvironment.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { recordCycleObjectiveEvent } from './cycleObjectiveService.js';
import { squadAveragePower } from './combat/squadPowerScaling.js';
import { grantReconnaissanceLoot } from './combatLootService.js';
import { buildSquadSnapshotFromNinjas } from './scoutIntelService.js';
import { assembleNarrative } from './narrative/narrativeAssembler.js';
import { persistReconNarrativeSegments, getReconNarrativeSegments } from './reconNarrativeStore.js';
import { resolveSegmentText } from './narrative/narrativeI18n.js';
import { mapChronicleSegmentForClient } from './narrative/pliExchangeView.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { buildSenseiIdentities } from './senseiIdentityService.js';
import { recordVillageScore } from './villageService.js';

export const RECON_MIN_HOUR = 0;
/** Inscriptions et défis jusqu'à H35 — résolution à H36. */
export const RECON_REGISTRATION_MAX_HOUR = 35;
export const RECON_RESOLVE_HOUR = 36;
/** @deprecated Utiliser RECON_REGISTRATION_MAX_HOUR */
export const RECON_MAX_HOUR = RECON_REGISTRATION_MAX_HOUR;
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

export function outcomeForUser(result, userId, homeUserId) {
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

function parseJsonField(value) {
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
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
  if (clock.hour < RECON_MIN_HOUR || clock.hour > RECON_REGISTRATION_MAX_HOUR) {
    const error = new Error(
      `Mission de reconnaissance : inscriptions et défis entre H${RECON_MIN_HOUR} et H${RECON_REGISTRATION_MAX_HOUR} (résolution à H${RECON_RESOLVE_HOUR}).`
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

export async function isCommittedToRecon(userId, cycleStartAt, { exceptChallengeId = null } = {}) {
  if (!cycleStartAt) return false;
  if (await hasPlayedReconThisCycle(userId, cycleStartAt)) return true;

  const reg = await query(
    `SELECT id FROM reconnaissance_registrations
     WHERE cycle_start_at = ? AND user_id = ? AND status = 'queued'
     LIMIT 1`,
    [cycleStartAt, userId]
  );
  if (reg.length) return true;

  const outgoingParams = [cycleStartAt, userId];
  let outgoingSql = `SELECT id FROM reconnaissance_challenges
     WHERE cycle_start_at = ? AND challenger_user_id = ? AND status = 'pending'`;
  if (exceptChallengeId) {
    outgoingSql += ' AND id != ?';
    outgoingParams.push(exceptChallengeId);
  }
  outgoingSql += ' LIMIT 1';
  const outgoing = await query(outgoingSql, outgoingParams);
  if (outgoing.length) return true;

  const acceptedParams = [cycleStartAt, userId, userId];
  let acceptedSql = `SELECT id FROM reconnaissance_challenges
     WHERE cycle_start_at = ? AND status = 'accepted' AND mission_id IS NULL
       AND (challenger_user_id = ? OR defender_user_id = ?)`;
  if (exceptChallengeId) {
    acceptedSql += ' AND id != ?';
    acceptedParams.push(exceptChallengeId);
  }
  acceptedSql += ' LIMIT 1';
  const accepted = await query(acceptedSql, acceptedParams);
  return accepted.length > 0;
}

/** Mission de recon du cycle — utilisée pour déterminer la qualité du rapport d'espionnage. */
export async function getUserReconMissionForCycle(userId, cycleStartAt) {
  if (!cycleStartAt) return null;
  const rows = await query(
    `SELECT id, home_user_id, result, combat_log
     FROM reconnaissance_missions
     WHERE cycle_start_at = ? AND (home_user_id = ? OR away_user_id = ?)
     ORDER BY created_at DESC
     LIMIT 1`,
    [cycleStartAt, userId, userId]
  );
  if (!rows[0]) return null;

  const row = rows[0];
  const combatLog = parseJsonField(row.combat_log);
  const isHome = row.home_user_id === userId;
  const scorePct = isHome ? combatLog?.homeScorePct : combatLog?.awayScorePct;
  return {
    missionId: row.id,
    outcome: outcomeForUser(row.result, userId, row.home_user_id),
    scorePct: typeof scorePct === 'number' ? scorePct : null,
  };
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
    const error = new Error('Un défi de reconnaissance est en attente — réglez-le avant de continuer.');
    error.statusCode = 409;
    throw error;
  }
}

async function assertEligibleParticipant(userId, cycleStartAt) {
  await assertBasicReconEligibility(userId, cycleStartAt);
  if (await isCommittedToRecon(userId, cycleStartAt)) {
    const error = new Error('Vous êtes déjà inscrit ou engagé dans une mission de reconnaissance ce cycle.');
    error.statusCode = 409;
    throw error;
  }
}

async function loadSenseiName(userId) {
  const rows = await query('SELECT name FROM sensei WHERE user_id = ?', [userId]);
  return rows[0]?.name || 'Sensei';
}

async function loadNarrativeContext(userId) {
  const senseiRows = await query('SELECT name FROM sensei WHERE user_id = ?', [userId]);
  const ninjas = await query(
    `SELECT name FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [userId]
  );
  return { senseiName: senseiRows[0]?.name || 'Sensei', ninjas };
}

export async function findMatchmakingOpponent(userId, cycleStartAt, { excludeUserIds = [] } = {}) {
  const pool = await findUserPool(userId);
  const divisionLevel = pool?.division_level ?? 5;
  const myPower = await getUserSquadPower(userId);
  if (!myPower) return null;

  const minDiv = Math.max(1, divisionLevel - DIVISION_TOLERANCE);
  const maxDiv = Math.min(5, divisionLevel + DIVISION_TOLERANCE);
  const exclude = new Set([userId, ...excludeUserIds]);

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
           AND rc.status IN ('pending', 'accepted')
           AND rc.mission_id IS NULL
           AND (rc.challenger_user_id = u.id OR rc.defender_user_id = u.id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM reconnaissance_registrations rr
         WHERE rr.cycle_start_at = ? AND rr.user_id = u.id AND rr.status = 'queued'
       )
     HAVING avg_power IS NOT NULL`,
    [userId, minDiv, maxDiv, cycleStartAt, cycleStartAt, cycleStartAt]
  );

  const filtered = candidates.filter((row) => {
    if (exclude.has(row.user_id)) return false;
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
  await recordCycleObjectiveEvent(userId, 'recon_complete');
}

async function persistReconNarrative(missionId, homeUserId, awayUserId, combat, envSlug) {
  const [homeCtx, awayCtx] = await Promise.all([
    loadNarrativeContext(homeUserId),
    loadNarrativeContext(awayUserId),
  ]);

  const narrative = assembleNarrative({
    matchId: missionId,
    homeSensei: homeCtx.senseiName,
    awaySensei: awayCtx.senseiName,
    homeNinjas: homeCtx.ninjas,
    awayNinjas: awayCtx.ninjas,
    combatLog: combat.combatLogPayload,
    winner: combat.winner,
    endReason: combat.endReason,
    endingTour: combat.endingTour,
    environmentSlug: envSlug,
  });

  const instantSegments = narrative.segments.map((seg) => ({
    ...seg,
    unlock_minutes: 0,
  }));
  await persistReconNarrativeSegments(missionId, instantSegments);
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

  const [homeTeamData, awayTeamData] = await Promise.all([
    loadTeamForCombat(homeUserId),
    loadTeamForCombat(awayUserId),
  ]);

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
    squadSnapshots: {
      home: buildSquadSnapshotFromNinjas(homeTeamData.ninjas, 'fr'),
      away: buildSquadSnapshotFromNinjas(awayTeamData.ninjas, 'fr'),
    },
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
  await persistReconNarrative(missionId, homeUserId, awayUserId, {
    ...combat,
    combatLogPayload,
  }, env.slug);

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
  await recordVillageScore(
    homeUserId,
    homeOutcome === 'win' ? 'recon_win' : 'recon_participate'
  );
  if (!awayIsBot) {
    await notifyReconResult(awayUserId, {
      ...summaryPayload,
      role: 'away',
      outcome: awayOutcome,
      opponentName: homeName,
      ryos: awayRyos,
    });
    await recordVillageScore(
      awayUserId,
      awayOutcome === 'win' ? 'recon_win' : 'recon_participate'
    );
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

async function markRegistrationResolved(userId, cycleStartAt, missionId) {
  await query(
    `UPDATE reconnaissance_registrations
     SET status = 'resolved', mission_id = ?, resolved_at = UTC_TIMESTAMP()
     WHERE cycle_start_at = ? AND user_id = ? AND status IN ('queued', 'matched')`,
    [missionId, cycleStartAt, userId]
  );
}

async function pairQueuedRegistrations(queued) {
  const remaining = [...queued];
  const pairs = [];

  while (remaining.length >= 2) {
    const user = remaining.shift();
    const myPower = await getUserSquadPower(user.user_id);
    if (!myPower) continue;

    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const oppPower = await getUserSquadPower(remaining[i].user_id);
      if (!oppPower) continue;
      const ratio = oppPower / myPower;
      if (ratio < 1 - POWER_TOLERANCE || ratio > 1 + POWER_TOLERANCE) continue;
      const diff = Math.abs(oppPower - myPower);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      const opponent = remaining.splice(bestIdx, 1)[0];
      pairs.push([user, opponent]);
    } else {
      remaining.unshift(user);
      break;
    }
  }

  return { pairs, unpaired: remaining };
}

export async function resolveReconnaissanceAtH36(cycleStartAt) {
  const results = [];

  const acceptedChallenges = await query(
    `SELECT * FROM reconnaissance_challenges
     WHERE cycle_start_at = ? AND status = 'accepted' AND mission_id IS NULL
     ORDER BY created_at ASC`,
    [cycleStartAt]
  );

  for (const challenge of acceptedChallenges) {
    const fight = await executeReconnaissanceFight({
      homeUserId: challenge.challenger_user_id,
      awayUserId: challenge.defender_user_id,
      awayIsBot: false,
      source: 'challenge',
      challengeId: challenge.id,
      cycleStartAt,
    });

    await query(
      `UPDATE reconnaissance_challenges SET mission_id = ? WHERE id = ?`,
      [fight.missionId, challenge.id]
    );

    await markRegistrationResolved(challenge.challenger_user_id, cycleStartAt, fight.missionId);
    await markRegistrationResolved(challenge.defender_user_id, cycleStartAt, fight.missionId);
    results.push(fight);
  }

  const queued = await query(
    `SELECT * FROM reconnaissance_registrations
     WHERE cycle_start_at = ? AND status = 'queued'
     ORDER BY created_at ASC`,
    [cycleStartAt]
  );

  const challengeUserIds = new Set(
    acceptedChallenges.flatMap((c) => [c.challenger_user_id, c.defender_user_id])
  );
  const eligibleQueue = queued.filter((row) => !challengeUserIds.has(row.user_id));

  const { pairs, unpaired } = await pairQueuedRegistrations(eligibleQueue);

  for (const [homeReg, awayReg] of pairs) {
    const fight = await executeReconnaissanceFight({
      homeUserId: homeReg.user_id,
      awayUserId: awayReg.user_id,
      awayIsBot: false,
      source: 'matchmaking',
      cycleStartAt,
    });

    await markRegistrationResolved(homeReg.user_id, cycleStartAt, fight.missionId);
    await markRegistrationResolved(awayReg.user_id, cycleStartAt, fight.missionId);
    results.push(fight);
  }

  for (const reg of unpaired) {
    const pool = await findUserPool(reg.user_id);
    const bot = pool ? await pickBotOpponent(reg.user_id, pool.id) : null;
    if (!bot) {
      await query(
        `UPDATE reconnaissance_registrations SET status = 'cancelled', resolved_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [reg.id]
      );
      continue;
    }

    const fight = await executeReconnaissanceFight({
      homeUserId: reg.user_id,
      awayUserId: bot.userId,
      awayIsBot: true,
      source: 'matchmaking',
      cycleStartAt,
    });

    await markRegistrationResolved(reg.user_id, cycleStartAt, fight.missionId);
    results.push(fight);
  }

  await query(
    `UPDATE reconnaissance_challenges
     SET status = 'expired', responded_at = UTC_TIMESTAMP()
     WHERE cycle_start_at = ? AND status = 'pending'`,
    [cycleStartAt]
  );

  return results;
}

export async function startMatchmaking(userId) {
  await assertReconnaissanceWindow();
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow.cycle_start_at;
  await assertEligibleParticipant(userId, cycleStartAt);

  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune ligue active — impossible de s\'inscrire à la reconnaissance.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await query(
    `SELECT id FROM reconnaissance_registrations
     WHERE cycle_start_at = ? AND user_id = ? AND status = 'queued'`,
    [cycleStartAt, userId]
  );
  if (existing.length) {
    const error = new Error('Vous êtes déjà inscrit à la file de reconnaissance.');
    error.statusCode = 409;
    throw error;
  }

  const insert = await query(
    `INSERT INTO reconnaissance_registrations (cycle_start_at, user_id, status)
     VALUES (?, ?, 'queued')`,
    [cycleStartAt, userId]
  );

  await query('UPDATE sensei SET onboarding_recon_done = 1 WHERE user_id = ?', [userId]);

  return {
    registrationId: insert.insertId,
    status: 'queued',
    resolvesAtHour: RECON_RESOLVE_HOUR,
  };
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

  await query('UPDATE sensei SET onboarding_recon_done = 1 WHERE user_id = ?', [challengerId]);

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
    resolvesAtHour: RECON_RESOLVE_HOUR,
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

  if (await isCommittedToRecon(challenge.challenger_user_id, cycleStartAt, { exceptChallengeId: challengeId })) {
    const error = new Error('Le challenger est déjà engagé dans une autre reconnaissance.');
    error.statusCode = 409;
    throw error;
  }
  if (await isCommittedToRecon(defenderId, cycleStartAt, { exceptChallengeId: challengeId })) {
    const error = new Error('Vous êtes déjà engagé dans une autre reconnaissance.');
    error.statusCode = 409;
    throw error;
  }

  await query(
    `UPDATE reconnaissance_registrations SET status = 'cancelled', resolved_at = UTC_TIMESTAMP()
     WHERE cycle_start_at = ? AND user_id IN (?, ?) AND status = 'queued'`,
    [cycleStartAt, challenge.challenger_user_id, defenderId]
  );

  await query(
    `UPDATE reconnaissance_challenges
     SET status = 'accepted', responded_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [challengeId]
  );

  const [challengerName, defenderName] = await Promise.all([
    loadSenseiName(challenge.challenger_user_id),
    loadSenseiName(defenderId),
  ]);

  await createSenseiNotification(challenge.challenger_user_id, 'reconnaissance_challenge', {
    challengeId,
    accepted: true,
    defenderName,
  });

  return {
    challengeId,
    status: 'accepted',
    scheduledForHour: RECON_RESOLVE_HOUR,
    challengerName,
    defenderName,
  };
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
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

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
           AND rc.status IN ('pending', 'accepted')
           AND rc.mission_id IS NULL
           AND (rc.challenger_user_id = u.id OR rc.defender_user_id = u.id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM reconnaissance_registrations rr
         WHERE rr.cycle_start_at = ? AND rr.user_id = u.id AND rr.status = 'queued'
       )
     ORDER BY p.division_level ASC, s.name ASC
     LIMIT ${safeLimit}`,
    [userId, minDiv, maxDiv, cycleStartAt, cycleStartAt, cycleStartAt]
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

export async function getReconnaissanceMission(missionId, userId) {
  const rows = await query(
    `SELECT rm.*, hs.name AS home_sensei, aws.name AS away_sensei
     FROM reconnaissance_missions rm
     JOIN sensei hs ON hs.user_id = rm.home_user_id
     JOIN sensei aws ON aws.user_id = rm.away_user_id
     WHERE rm.id = ?`,
    [missionId]
  );
  const row = rows[0];
  if (!row) {
    const error = new Error('Mission de reconnaissance introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (row.home_user_id !== userId && row.away_user_id !== userId) {
    const error = new Error('Accès refusé à cette mission.');
    error.statusCode = 403;
    throw error;
  }

  const viewerLocale = await getUserLanguage(userId);
  const segments = await getReconNarrativeSegments(missionId);
  const chronicle = segments.map((s) =>
    mapChronicleSegmentForClient(s, (seg) => resolveSegmentText(viewerLocale, seg))
  );

  const identityMap = await buildSenseiIdentities(
    [row.home_user_id, row.away_user_id],
    viewerLocale
  );

  const ninjaRows = await query(
    `SELECT name FROM ninjas
     WHERE user_id IN (?, ?) AND squad_position IS NOT NULL
     ORDER BY user_id, squad_position`,
    [row.home_user_id, row.away_user_id]
  );

  const formatted = formatMissionRow(row, userId);
  const combatLog = parseJsonField(row.combat_log);

  return {
    mission: {
      ...formatted,
      homeSensei: row.home_sensei,
      awaySensei: row.away_sensei,
      opponentName: formatted.role === 'home' ? row.away_sensei : row.home_sensei,
      homeIdentity: identityMap.get(row.home_user_id) ?? null,
      awayIdentity: identityMap.get(row.away_user_id) ?? null,
    },
    chronicle,
    chronicleCast: {
      ninjas: ninjaRows.map((n) => n.name),
      senseiIdentities: [
        identityMap.get(row.home_user_id),
        identityMap.get(row.away_user_id),
      ].filter(Boolean),
    },
    combatLog: combatLog
      ? {
          homeScorePct: combatLog.homeScorePct,
          awayScorePct: combatLog.awayScorePct,
          possession: combatLog.possession,
          environment: combatLog.environment,
        }
      : null,
  };
}

export async function getReconnaissanceState(userId) {
  const clock = await getGameClock();
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at ?? null;
  const available =
    clock.hour >= RECON_MIN_HOUR &&
    clock.hour <= RECON_REGISTRATION_MAX_HOUR &&
    Boolean(cycleStartAt);

  let played = false;
  let committed = false;
  let registration = null;
  let scheduledChallenge = null;
  let lastMission = null;
  let pendingIncoming = [];
  let pendingOutgoing = null;

  if (cycleStartAt) {
    played = await hasPlayedReconThisCycle(userId, cycleStartAt);
    committed = !played && (await isCommittedToRecon(userId, cycleStartAt));

    const regRows = await query(
      `SELECT id, status, created_at FROM reconnaissance_registrations
       WHERE cycle_start_at = ? AND user_id = ? AND status = 'queued'
       LIMIT 1`,
      [cycleStartAt, userId]
    );
    if (regRows[0]) {
      registration = {
        registrationId: regRows[0].id,
        status: regRows[0].status,
        createdAt: regRows[0].created_at,
        resolvesAtHour: RECON_RESOLVE_HOUR,
      };
    }

    const scheduled = await query(
      `SELECT rc.*,
              cs.name AS challenger_name,
              ds.name AS defender_name
       FROM reconnaissance_challenges rc
       JOIN sensei cs ON cs.user_id = rc.challenger_user_id
       JOIN sensei ds ON ds.user_id = rc.defender_user_id
       WHERE rc.cycle_start_at = ?
         AND rc.status = 'accepted'
         AND rc.mission_id IS NULL
         AND (rc.challenger_user_id = ? OR rc.defender_user_id = ?)
       LIMIT 1`,
      [cycleStartAt, userId, userId]
    );
    if (scheduled[0]) {
      const ch = scheduled[0];
      scheduledChallenge = {
        challengeId: ch.id,
        role: ch.challenger_user_id === userId ? 'challenger' : 'defender',
        opponentName:
          ch.challenger_user_id === userId ? ch.defender_name : ch.challenger_name,
        opponentUserId:
          ch.challenger_user_id === userId ? ch.defender_user_id : ch.challenger_user_id,
        scheduledForHour: RECON_RESOLVE_HOUR,
      };
    }

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
    committed,
    registration,
    scheduledChallenge,
    pendingIncoming,
    pendingOutgoing,
    lastMission,
    resolvesAtHour: RECON_RESOLVE_HOUR,
    rewards: {
      winRyos: RECON_WIN_RYOS,
      drawRyos: RECON_DRAW_RYOS,
      lossRyos: RECON_LOSS_RYOS,
      includesItem: true,
      includesTacticCardChance: true,
    },
  };
}
