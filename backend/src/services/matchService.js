import { query } from '../config/database.js';

async function getTeamPower(userId) {
  const ninjas = await query(
    `SELECT taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence
     FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL`,
    [userId]
  );
  return ninjas.reduce(
    (sum, n) => sum + n.taijutsu + n.ninjutsu + n.genjutsu + n.vitesse + n.intelligence,
    0
  );
}

function decideResult(homePower, awayPower) {
  const diff = homePower - awayPower;
  if (Math.abs(diff) < 8) {
    return { result: 'draw', homeScore: 1, awayScore: 1, winnerUserId: null };
  }
  if (diff > 0) {
    return { result: 'home_win', homeScore: 2, awayScore: 0, winnerUserId: 'home' };
  }
  return { result: 'away_win', homeScore: 0, awayScore: 2, winnerUserId: 'away' };
}

export async function simulateMatchesForCycle(poolId, seasonCycle) {
  const matches = await query(
    `SELECT * FROM matches
     WHERE pool_id = ? AND season_cycle = ? AND status = 'scheduled'`,
    [poolId, seasonCycle]
  );

  const results = [];
  for (const match of matches) {
    const homePower = await getTeamPower(match.home_user_id);
    const awayPower = await getTeamPower(match.away_user_id);
    const outcome = decideResult(homePower, awayPower);
    const winnerUserId =
      outcome.winnerUserId === 'home'
        ? match.home_user_id
        : outcome.winnerUserId === 'away'
          ? match.away_user_id
          : null;

    await query(
      `UPDATE matches
       SET status = 'simulated', result = ?, home_score = ?, away_score = ?,
           winner_user_id = ?, ending_tour = ?, simulated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        outcome.result,
        outcome.homeScore,
        outcome.awayScore,
        winnerUserId,
        7 + Math.floor(Math.random() * 4),
        match.id,
      ]
    );
    results.push({ matchId: match.id, ...outcome, winnerUserId });
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
