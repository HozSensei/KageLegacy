import { query } from '../config/database.js';
import { simulateMatchCombat } from './combat/matchLoader.js';
import {
  applyPostMatchForMatch,
  persistSenseiChakra,
} from './combat/postMatch.js';

function mapWinnerToDb(winner, homeUserId, awayUserId) {
  if (winner === 'home') return { result: 'home_win', winnerUserId: homeUserId };
  if (winner === 'away') return { result: 'away_win', winnerUserId: awayUserId };
  return { result: 'draw', winnerUserId: null };
}

function mapScores(winner, endReason) {
  if (winner === 'draw') return { homeScore: 1, awayScore: 1 };
  const koBonus = endReason === 'ko' ? 2 : 1;
  if (winner === 'home') return { homeScore: koBonus, awayScore: 0 };
  return { homeScore: 0, awayScore: koBonus };
}

export async function simulateMatchesForCycle(poolId, seasonCycle) {
  const matches = await query(
    `SELECT * FROM matches
     WHERE pool_id = ? AND season_cycle = ? AND status = 'scheduled'`,
    [poolId, seasonCycle]
  );

  const results = [];
  for (const match of matches) {
    const combat = await simulateMatchCombat(match.home_user_id, match.away_user_id);
    const { result, winnerUserId } = mapWinnerToDb(
      combat.winner,
      match.home_user_id,
      match.away_user_id
    );
    const scores = mapScores(combat.winner, combat.endReason);

    await persistSenseiChakra(match.home_user_id, combat.homeTeam.sensei.chakraPool);
    await persistSenseiChakra(match.away_user_id, combat.awayTeam.sensei.chakraPool);

    const now = new Date();
    const endingReveal = new Date(now.getTime() + 45 * 60 * 1000);

    await query(
      `UPDATE matches
       SET status = 'revealing', result = ?, home_score = ?, away_score = ?,
           winner_user_id = ?, ending_tour = ?, combat_log = ?,
           simulated_at = UTC_TIMESTAMP(), reveal_start_at = ?, ending_reveal_at = ?
       WHERE id = ?`,
      [
        result,
        scores.homeScore,
        scores.awayScore,
        winnerUserId,
        combat.endingTour,
        JSON.stringify({
          logs: combat.logs,
          endReason: combat.endReason,
          homeScorePct: combat.homeScorePct,
          awayScorePct: combat.awayScorePct,
          koNinjaIds: combat.koNinjaIds,
          possession: combat.possession,
        }),
        now,
        endingReveal,
        match.id,
      ]
    );

    results.push({
      matchId: match.id,
      result,
      winnerUserId,
      endingTour: combat.endingTour,
      tours: combat.logs.length,
    });
  }
  return results;
}

export async function simulateAllPoolsCurrentCycle() {
  const pools = await query(`SELECT id, current_cycle FROM pools WHERE status = 'active'`);
  const all = [];
  for (const pool of pools) {
    const simulated = await simulateMatchesForCycle(pool.id, pool.current_cycle);
    all.push({ poolId: pool.id, cycle: pool.current_cycle, simulated });
  }
  return all;
}

async function applyStanding(poolId, userId, result) {
  const points = result === 'win' ? 3 : result === 'draw' ? 1 : 0;
  const col = result === 'win' ? 'wins' : result === 'draw' ? 'draws' : 'losses';
  await query(
    `UPDATE pool_standings
     SET points = points + ?, played = played + 1, ${col} = ${col} + 1
     WHERE pool_id = ? AND user_id = ?`,
    [points, poolId, userId]
  );
}

export async function applyMatchResultsForPool(poolId, seasonCycle) {
  const matches = await query(
    `SELECT * FROM matches
     WHERE pool_id = ? AND season_cycle = ? AND status IN ('simulated', 'revealing')`,
    [poolId, seasonCycle]
  );

  for (const match of matches) {
    if (match.result === 'home_win') {
      await applyStanding(poolId, match.home_user_id, 'win');
      await applyStanding(poolId, match.away_user_id, 'loss');
    } else if (match.result === 'away_win') {
      await applyStanding(poolId, match.away_user_id, 'win');
      await applyStanding(poolId, match.home_user_id, 'loss');
    } else if (match.result === 'draw') {
      await applyStanding(poolId, match.home_user_id, 'draw');
      await applyStanding(poolId, match.away_user_id, 'draw');
    }

    let koNinjaIds = [];
    if (match.combat_log) {
      const parsed = typeof match.combat_log === 'string' ? JSON.parse(match.combat_log) : match.combat_log;
      koNinjaIds = parsed.koNinjaIds || [];
    }
    await applyPostMatchForMatch(match.home_user_id, match.away_user_id, koNinjaIds);

    await query(
      `UPDATE matches SET status = 'applied', results_applied_at = UTC_TIMESTAMP() WHERE id = ?`,
      [match.id]
    );
  }

  return matches.length;
}

export async function applyAllPoolsMatchResults() {
  const pools = await query(`SELECT id, current_cycle FROM pools WHERE status = 'active'`);
  const summary = [];
  for (const pool of pools) {
    const applied = await applyMatchResultsForPool(pool.id, pool.current_cycle);
    summary.push({ poolId: pool.id, cycle: pool.current_cycle, applied });
  }
  return summary;
}

export async function getUserMatchForCycle(userId, seasonCycle) {
  const rows = await query(
    `SELECT m.*,
            hs.name AS home_sensei, aws.name AS away_sensei,
            hu.is_bot AS home_is_bot, au.is_bot AS away_is_bot
     FROM matches m
     JOIN sensei hs ON hs.user_id = m.home_user_id
     JOIN sensei aws ON aws.user_id = m.away_user_id
     JOIN users hu ON hu.id = m.home_user_id
     JOIN users au ON au.id = m.away_user_id
     WHERE (m.home_user_id = ? OR m.away_user_id = ?) AND m.season_cycle = ?
     LIMIT 1`,
    [userId, userId, seasonCycle]
  );
  return rows[0] || null;
}
