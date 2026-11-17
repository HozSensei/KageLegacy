/**
 * H2H saison + némésis pour le classement de ligue / prochain match.
 */

import { query } from '../config/database.js';
import { getGameClock } from './gameClock.js';

/** Aligné sur reconnaissance : inscriptions / défis H0–H35 */
const RECON_CHALLENGE_MIN_HOUR = 0;
const RECON_CHALLENGE_MAX_HOUR = 35;

/**
 * Agrège W/D/L de viewer vs chaque adversaire (même pool, saison courante via matches de la pool).
 */
export async function buildPoolH2hMap(viewerUserId, poolId) {
  const matches = await query(
    `SELECT home_user_id, away_user_id, result
     FROM matches
     WHERE pool_id = ? AND status = 'applied' AND result IN ('home_win', 'away_win', 'draw')
       AND (home_user_id = ? OR away_user_id = ?)`,
    [poolId, viewerUserId, viewerUserId],
  );

  const map = new Map();
  for (const m of matches) {
    const opponentId = m.home_user_id === viewerUserId ? m.away_user_id : m.home_user_id;
    if (!map.has(opponentId)) {
      map.set(opponentId, { wins: 0, draws: 0, losses: 0 });
    }
    const h2h = map.get(opponentId);
    if (m.result === 'draw') {
      h2h.draws += 1;
    } else if (
      (m.result === 'home_win' && m.home_user_id === viewerUserId) ||
      (m.result === 'away_win' && m.away_user_id === viewerUserId)
    ) {
      h2h.wins += 1;
    } else {
      h2h.losses += 1;
    }
  }
  return map;
}

export async function buildNemesisMap(viewerUserId, poolId) {
  try {
    const rows = await query(
      `SELECT rival_user_id, consecutive_losses, is_nemesis, last_result
       FROM sensei_rivalries
       WHERE user_id = ? AND pool_id = ?`,
      [viewerUserId, poolId],
    );
    return new Map(
      rows.map((r) => [
        r.rival_user_id,
        {
          isNemesis: Boolean(r.is_nemesis),
          consecutiveLosses: r.consecutive_losses,
          lastResult: r.last_result,
        },
      ]),
    );
  } catch {
    // Table absente si migration 061 pas encore appliquée
    return new Map();
  }
}

/**
 * Fenêtre recon ouverte + joueur pas bot → CTA possible côté UI
 * (l'API createChallenge valide l'éligibilité fine).
 */
export async function canShowReconChallengeCta(viewerUserId, targetUserId, targetIsBot) {
  if (!targetUserId || targetUserId === viewerUserId || targetIsBot) return false;
  const clock = await getGameClock();
  const hour = clock.hour ?? 0;
  return hour >= RECON_CHALLENGE_MIN_HOUR && hour <= RECON_CHALLENGE_MAX_HOUR;
}

/**
 * Enrichit les lignes de classement pour le viewer.
 */
export async function enrichStandingsSocial(viewerUserId, poolId, standings) {
  const [h2hMap, nemesisMap, clock] = await Promise.all([
    buildPoolH2hMap(viewerUserId, poolId),
    buildNemesisMap(viewerUserId, poolId),
    getGameClock(),
  ]);
  const hour = clock.hour ?? 0;
  const reconWindow = hour >= RECON_CHALLENGE_MIN_HOUR && hour <= RECON_CHALLENGE_MAX_HOUR;

  return standings.map((row) => {
    const h2h = h2hMap.get(row.userId) || { wins: 0, draws: 0, losses: 0 };
    const rival = nemesisMap.get(row.userId);
    const isSelf = row.userId === viewerUserId;
    return {
      ...row,
      h2h: isSelf ? null : h2h,
      isNemesis: Boolean(rival?.isNemesis),
      consecutiveLosses: rival?.consecutiveLosses ?? 0,
      canChallengeRecon: reconWindow && !isSelf && !row.isBot,
    };
  });
}

export async function enrichNextMatchSocial(viewerUserId, poolId, nextMatch) {
  if (!nextMatch) return null;
  const opponentId =
    nextMatch.homeUserId === viewerUserId ? nextMatch.awayUserId : nextMatch.homeUserId;
  const opponentIsBot =
    nextMatch.homeUserId === viewerUserId ? nextMatch.away?.isBot : nextMatch.home?.isBot;

  const [h2hMap, nemesisMap] = await Promise.all([
    buildPoolH2hMap(viewerUserId, poolId),
    buildNemesisMap(viewerUserId, poolId),
  ]);
  const h2h = h2hMap.get(opponentId) || { wins: 0, draws: 0, losses: 0 };
  const rival = nemesisMap.get(opponentId);
  const canChallenge = await canShowReconChallengeCta(viewerUserId, opponentId, opponentIsBot);

  return {
    ...nextMatch,
    opponentUserId: opponentId,
    h2h,
    isNemesis: Boolean(rival?.isNemesis),
    consecutiveLosses: rival?.consecutiveLosses ?? 0,
    canChallengeRecon: canChallenge,
  };
}

/**
 * Compteurs humains / bots pour l'invite.
 */
export async function getPoolRosterCounts(poolId) {
  const rows = await query(
    `SELECT
       SUM(CASE WHEN u.is_bot = FALSE THEN 1 ELSE 0 END) AS humans,
       SUM(CASE WHEN u.is_bot = TRUE THEN 1 ELSE 0 END) AS bots,
       COUNT(*) AS total
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pool_id = ?`,
    [poolId],
  );
  const row = rows[0] || {};
  return {
    humans: Number(row.humans || 0),
    bots: Number(row.bots || 0),
    total: Number(row.total || 0),
    capacity: 6,
  };
}
