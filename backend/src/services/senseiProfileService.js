import { query } from '../config/database.js';
import { DIVISION_ROMAN } from '../models/league.js';
import { buildSenseiIdentity } from './senseiIdentityService.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { findUserPool } from './poolService.js';

export async function getSenseiPublicProfile(targetUserId, viewerUserId = null) {
  const senseiRows = await query(
    `SELECT s.user_id, s.name, s.reputation, u.is_bot
     FROM sensei s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = ?
     LIMIT 1`,
    [targetUserId],
  );
  const sensei = senseiRows[0];
  if (!sensei) {
    const error = new Error('Sensei introuvable.');
    error.statusCode = 404;
    throw error;
  }

  const locale = viewerUserId ? await getUserLanguage(viewerUserId) : 'fr';
  const pool = await findUserPool(targetUserId);
  const identity = await buildSenseiIdentity(targetUserId, locale, pool);

  let publicStats = {
    reputation: sensei.reputation,
    division: null,
    seasonPoints: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    season: null,
  };

  if (pool) {
    const standingRows = await query(
      `SELECT points, played, wins, draws, losses FROM pool_standings
       WHERE pool_id = ? AND user_id = ? LIMIT 1`,
      [pool.id, targetUserId],
    );
    const standing = standingRows[0];
    publicStats = {
      reputation: sensei.reputation,
      division: DIVISION_ROMAN[pool.division_level] || String(pool.division_level),
      seasonPoints: standing?.points ?? 0,
      played: standing?.played ?? 0,
      wins: standing?.wins ?? 0,
      draws: standing?.draws ?? 0,
      losses: standing?.losses ?? 0,
      season: pool.season_number,
      currentCycle: pool.current_cycle,
    };
  }

  const recentRows = await query(
    `SELECT m.id, m.season_cycle, m.result, m.home_user_id, m.away_user_id,
            hs.name AS home_sensei, aws.name AS away_sensei
     FROM matches m
     JOIN sensei hs ON hs.user_id = m.home_user_id
     JOIN sensei aws ON aws.user_id = m.away_user_id
     WHERE (m.home_user_id = ? OR m.away_user_id = ?) AND m.status = 'applied'
     ORDER BY m.results_applied_at DESC
     LIMIT 1`,
    [targetUserId, targetUserId],
  );

  const recent = recentRows[0];
  const recentMatch = recent
    ? {
        id: recent.id,
        cycle: recent.season_cycle,
        result: recent.result,
        isHome: recent.home_user_id === targetUserId,
        opponentName:
          recent.home_user_id === targetUserId ? recent.away_sensei : recent.home_sensei,
      }
    : null;

  return {
    identity,
    publicStats,
    recentMatch,
    isOwnProfile: viewerUserId === targetUserId,
  };
}
