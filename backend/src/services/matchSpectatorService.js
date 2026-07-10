import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { DIVISION_ROMAN } from '../models/league.js';
import { buildSenseiIdentities } from './senseiIdentityService.js';
import { getUserLanguage } from './narrative/viewerLocale.js';

const SPECTATOR_STATUSES = new Set(['revealing', 'applied', 'simulated']);

export async function getViewerPoolId(userId) {
  const pool = await findUserPool(userId);
  return pool?.id ?? null;
}

export async function loadMatchRow(matchId) {
  const rows = await query(
    `SELECT m.*,
            hs.name AS home_sensei, aws.name AS away_sensei,
            hu.is_bot AS home_is_bot, au.is_bot AS away_is_bot,
            hu.is_guest AS home_is_guest, au.is_guest AS away_is_guest,
            p.division_level, p.season_number, p.current_cycle AS pool_current_cycle, p.status AS pool_status
     FROM matches m
     JOIN sensei hs ON hs.user_id = m.home_user_id
     JOIN sensei aws ON aws.user_id = m.away_user_id
     JOIN users hu ON hu.id = m.home_user_id
     JOIN users au ON au.id = m.away_user_id
     JOIN pools p ON p.id = m.pool_id
     WHERE m.id = ?`,
    [matchId]
  );
  return rows[0] || null;
}

export function isMatchParticipant(match, userId) {
  return match.home_user_id === userId || match.away_user_id === userId;
}

export async function assertViewerCanAccessMatch(userId, match) {
  const viewerPoolId = await getViewerPoolId(userId);
  const samePool = viewerPoolId === match.pool_id;

  if (samePool) return { samePool: true, isParticipant: isMatchParticipant(match, userId) };

  if (!SPECTATOR_STATUSES.has(match.status)) {
    const error = new Error('Ce match n\'est pas encore accessible en spectateur.');
    error.statusCode = 403;
    throw error;
  }

  return { samePool: false, isParticipant: false };
}

function mapMatchSummary(row, viewerUserId, identityMap = null) {
  const homeIdentity = identityMap?.get(row.home_user_id) ?? null;
  const awayIdentity = identityMap?.get(row.away_user_id) ?? null;
  return {
    id: row.id,
    cycle: row.season_cycle,
    status: row.status,
    result: row.result,
    homeUserId: row.home_user_id,
    awayUserId: row.away_user_id,
    home: {
      name: row.home_sensei,
      isBot: Boolean(row.home_is_bot),
      isGuest: Boolean(row.home_is_guest),
      identity: homeIdentity,
    },
    away: {
      name: row.away_sensei,
      isBot: Boolean(row.away_is_bot),
      isGuest: Boolean(row.away_is_guest),
      identity: awayIdentity,
    },
    homeScore: row.home_score,
    awayScore: row.away_score,
    isParticipant: isMatchParticipant(row, viewerUserId),
    isHome: row.home_user_id === viewerUserId,
    hasChronicle: SPECTATOR_STATUSES.has(row.status),
  };
}

export async function browsePools(userId) {
  const viewerPoolId = await getViewerPoolId(userId);
  const pools = await query(
    `SELECT p.id, p.division_level, p.season_number, p.current_cycle, p.status,
            (SELECT COUNT(*) FROM pool_members pm WHERE pm.pool_id = p.id) AS member_count
     FROM pools p
     WHERE p.status IN ('active', 'completed')
     ORDER BY p.division_level ASC, p.season_number DESC, p.id ASC`
  );

  return pools.map((p) => ({
    id: p.id,
    division: DIVISION_ROMAN[p.division_level] || String(p.division_level),
    divisionLevel: p.division_level,
    season: p.season_number,
    currentCycle: p.current_cycle,
    status: p.status,
    memberCount: p.member_count,
    isViewerPool: p.id === viewerPoolId,
  }));
}

export async function getPoolMatches(userId, poolId, { cycle } = {}) {
  const poolRows = await query('SELECT * FROM pools WHERE id = ?', [poolId]);
  const pool = poolRows[0];
  if (!pool) {
    const error = new Error('Pool introuvable.');
    error.statusCode = 404;
    throw error;
  }

  const viewerPoolId = await getViewerPoolId(userId);
  const samePool = viewerPoolId === poolId;
  const cycleFilter = cycle != null ? Number(cycle) : null;

  let sql = `SELECT m.*,
                    hs.name AS home_sensei, aws.name AS away_sensei,
                    hu.is_bot AS home_is_bot, au.is_bot AS away_is_bot,
                    hu.is_guest AS home_is_guest, au.is_guest AS away_is_guest
             FROM matches m
             JOIN sensei hs ON hs.user_id = m.home_user_id
             JOIN sensei aws ON aws.user_id = m.away_user_id
             JOIN users hu ON hu.id = m.home_user_id
             JOIN users au ON au.id = m.away_user_id
             WHERE m.pool_id = ?`;
  const params = [poolId];

  if (cycleFilter) {
    sql += ' AND m.season_cycle = ?';
    params.push(cycleFilter);
  }

  sql += ' ORDER BY m.season_cycle ASC, m.id ASC';

  const rows = await query(sql, params);

  const locale = await getUserLanguage(userId);
  const userIds = rows.flatMap((row) => [row.home_user_id, row.away_user_id]);
  const identityMap = await buildSenseiIdentities(userIds, locale, pool);

  const matches = rows
    .filter((row) => samePool || SPECTATOR_STATUSES.has(row.status))
    .map((row) => mapMatchSummary(row, userId, identityMap));

  const cycles = [...new Set(matches.map((m) => m.cycle))].sort((a, b) => a - b);

  return {
    pool: {
      id: pool.id,
      division: DIVISION_ROMAN[pool.division_level] || String(pool.division_level),
      divisionLevel: pool.division_level,
      season: pool.season_number,
      currentCycle: pool.current_cycle,
      status: pool.status,
      isViewerPool: samePool,
    },
    cycle: cycleFilter,
    cycles,
    matches,
  };
}
