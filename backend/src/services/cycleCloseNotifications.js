import { query } from '../config/database.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { getUserMatchForCycle } from './matchService.js';
import { findUserPool } from './poolService.js';

function matchOutcomeForUser(match, userId) {
  if (!match) return null;
  const isHome = match.home_user_id === userId;
  if (match.result === 'draw') return 'draw';
  if (match.result === 'home_win') return isHome ? 'win' : 'loss';
  if (match.result === 'away_win') return isHome ? 'loss' : 'win';
  return null;
}

function endedSeasonCycle(pool) {
  if (!pool) return null;
  if (pool.status === 'completed') return pool.current_cycle;
  return Math.max(1, pool.current_cycle - 1);
}

/** Résumé de clôture de cycle — visible sur le Bureau et dans l'historique des notifs. */
export async function createCycleCloseNotificationForUser(userId, {
  salaryDeducted = 0,
  seasonCycle = null,
} = {}) {
  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [userId]);
  const balanceAfter = senseiRows[0]?.ryos ?? 0;
  const pool = await findUserPool(userId);
  const cycle = seasonCycle ?? endedSeasonCycle(pool);
  let matchPayload = null;

  if (cycle != null) {
    const match = await getUserMatchForCycle(userId, cycle);
    if (match) {
      const opponentName =
        match.home_user_id === userId ? match.away_sensei : match.home_sensei;
      matchPayload = {
        opponentName,
        outcome: matchOutcomeForUser(match, userId),
        homeScore: match.home_score,
        awayScore: match.away_score,
        matchId: match.id,
      };
    }
  }

  await createSenseiNotification(userId, 'cycle_close', {
    salaryDeducted,
    balanceAfter,
    match: matchPayload,
    seasonCycle: cycle,
  });
}

export async function createCycleCloseNotificationsForAllUsers(salaryResults = []) {
  const salaryByUser = new Map(salaryResults.map((row) => [row.userId, row]));
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];

  for (const user of users) {
    const salary = salaryByUser.get(user.id);
    await createCycleCloseNotificationForUser(user.id, {
      salaryDeducted: salary?.deducted ?? 0,
    });
    results.push(user.id);
  }

  return results;
}
