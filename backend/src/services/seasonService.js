/**
 * Fin de saison (cycle 10) : promotions, relégations, archivage.
 */

import { query } from '../config/database.js';
import {
  LOWEST_DIVISION,
  assignUserToDivision,
  deleteBotsFromPool,
  removeMemberFromPool,
} from './poolService.js';
import { expireEliteSubscriptionsForSeason } from './eliteSubscriptionService.js';

const ELITE_DIVISION = 1;

function targetDivisionForRank(rank, currentDivision) {
  if (rank === 1) return Math.max(ELITE_DIVISION, currentDivision - 1);
  if (rank === 6) return Math.min(LOWEST_DIVISION, currentDivision + 1);
  return currentDivision;
}

export async function getPoolStandingsOrdered(poolId) {
  return query(
    `SELECT ps.user_id, ps.points, ps.wins, ps.played, u.is_bot, s.name AS sensei_name
     FROM pool_standings ps
     JOIN users u ON u.id = ps.user_id
     JOIN sensei s ON s.user_id = ps.user_id
     WHERE ps.pool_id = ?
     ORDER BY ps.points DESC, ps.wins DESC, ps.played ASC, ps.user_id ASC`,
    [poolId]
  );
}

/**
 * Applique montées/descentes et archive la pool terminée.
 */
export async function processSeasonEnd(poolId) {
  const poolRows = await query('SELECT * FROM pools WHERE id = ?', [poolId]);
  const pool = poolRows[0];
  if (!pool) return { poolId, skipped: true, reason: 'pool_not_found' };

  const standings = await getPoolStandingsOrdered(poolId);
  const relocations = [];

  for (let i = 0; i < standings.length; i += 1) {
    const row = standings[i];
    const rank = i + 1;
    const targetDivision = targetDivisionForRank(rank, pool.division_level);

    if (row.is_bot) continue;

    await removeMemberFromPool(poolId, row.user_id);
    const newPool = await assignUserToDivision(row.user_id, targetDivision, {
      seasonNumber: pool.season_number + 1,
    });

    relocations.push({
      userId: row.user_id,
      senseiName: row.sensei_name,
      rank,
      fromDivision: pool.division_level,
      toDivision: targetDivision,
      newPoolId: newPool?.id,
      promoted: rank === 1 && targetDivision < pool.division_level,
      relegated: rank === 6 && targetDivision > pool.division_level,
    });
  }

  const botsRemoved = await deleteBotsFromPool(poolId);

  const humanCount = standings.filter((r) => !r.is_bot).length;
  await query('UPDATE pools SET status = ? WHERE id = ?', [
    humanCount === 0 ? 'archived' : 'completed',
    poolId,
  ]);

  await expireEliteSubscriptionsForSeason(pool.season_number);

  return {
    poolId,
    division: pool.division_level,
    season: pool.season_number,
    relocations,
    botsRemoved,
    archived: humanCount === 0,
  };
}

export async function processAllCompletedSeasons(poolCycleResults) {
  const results = [];
  for (const entry of poolCycleResults) {
    if (entry.seasonEnded) {
      results.push(await processSeasonEnd(entry.poolId ?? entry.id));
    }
  }
  return results;
}
