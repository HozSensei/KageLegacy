import { query } from '../config/database.js';
import { ASYNC_DUEL_WEEKLY_VILLAGE_REWARD_RYOS } from '../config/economyConfig.js';
import { inTransaction } from '../db/transaction.js';
import { FACTION_IDS } from './factionCatalog.js';

export const UTC_WEEK_START = 'DATE_SUB(UTC_DATE(), INTERVAL WEEKDAY(UTC_DATE()) DAY)';

const UNREAD_REWARDS = `SELECT COUNT(*) AS unreadCount FROM async_duel_weekly_reward_ledger
                        WHERE user_id = ? AND read_at IS NULL`;

export async function getVillageRewards(userId) {
  const rows = await query(
    `SELECT DATE_FORMAT(l.week_start, '%Y-%m-%d') AS weekStart,
            DATE_FORMAT(DATE_ADD(l.week_start, INTERVAL 7 DAY), '%Y-%m-%d') AS weekEnd,
            l.ryos, s.winner_faction_id AS factionId,
            CONCAT(LEFT(DATE_FORMAT(s.settled_at, '%Y-%m-%dT%H:%i:%s.%f'), 23), 'Z') AS settledAt,
            u.unreadCount
     FROM async_duel_weekly_reward_ledger l
     JOIN async_duel_weekly_settlements s ON s.week_start = l.week_start
     CROSS JOIN (${UNREAD_REWARDS}) u
     WHERE l.user_id = ?
     ORDER BY l.week_start DESC LIMIT 20`,
    [userId, userId],
  );
  return {
    rewards: rows.map(({ unreadCount: _unreadCount, ...reward }) => reward),
    unreadCount: Number(rows[0]?.unreadCount ?? 0),
  };
}

export async function markVillageRewardsRead(userId, throughWeekStart) {
  // An acknowledgement must point to a real receipt for this account, even on retry.
  await query(
    `UPDATE async_duel_weekly_reward_ledger l
     JOIN async_duel_weekly_reward_ledger seen ON seen.user_id = l.user_id AND seen.week_start = ?
     SET l.read_at = UTC_TIMESTAMP(6)
     WHERE l.user_id = ? AND l.week_start <= seen.week_start AND l.read_at IS NULL`,
    [throughWeekStart, userId],
  );
  const [{ unreadCount }] = await query(UNREAD_REWARDS, [userId]);
  return { unreadCount: Number(unreadCount) };
}

export function rankVillagePoints(rows) {
  const totals = new Map(rows.map(({ id, points }) => [id, Number(points)]));
  return FACTION_IDS.map(id => ({ id, points: totals.get(id) ?? 0 })).sort(
    (a, b) => b.points - a.points,
  );
}

export function uniqueVillageWinner([first, second]) {
  return first.points > 0 && first.points > second.points ? first.id : null;
}

// A writer must lock before taking its UTC timestamp. At rollover, settlement waits for
// old-week writes to commit; newer writers cannot add points to the week being settled.
export async function lockWeeklyVillageWrites(connection) {
  const [[state]] = await connection.execute(
    'SELECT id FROM async_duel_weekly_state WHERE id = 1 FOR SHARE',
  );
  if (!state) throw new Error('Weekly village rewards are not installed; run db:migrate.');
}

export function withVillageMembershipChange(userId, factionId, change) {
  return inTransaction(async connection => {
    await lockWeeklyVillageWrites(connection);
    const result = await change(connection);
    await connection.execute(
      `INSERT INTO async_duel_village_membership (user_id, effective_at, faction_id)
       VALUES (?, UTC_TIMESTAMP(6), ?)`,
      [userId, factionId],
    );
    return result;
  });
}

async function settleNextWeek() {
  return inTransaction(async connection => {
    const [[state]] = await connection.execute(
      `SELECT DATE_FORMAT(next_week_start, '%Y-%m-%d') AS weekStart
       FROM async_duel_weekly_state WHERE id = 1 FOR UPDATE`,
    );
    if (!state) throw new Error('Weekly village rewards are not installed; run db:migrate.');
    const { weekStart } = state;
    const [[{ due }]] = await connection.execute(`SELECT ? < ${UTC_WEEK_START} AS due`, [
      weekStart,
    ]);
    if (!due) return false;
    const [points] = await connection.execute(
      `SELECT faction_id AS id, COUNT(*) AS points
       FROM async_duel_faction_points WHERE week_start = ? GROUP BY faction_id`,
      [weekStart],
    );
    const winner = uniqueVillageWinner(rankVillagePoints(points));
    const rewardRyos = winner ? ASYNC_DUEL_WEEKLY_VILLAGE_REWARD_RYOS : 0;
    await connection.execute(
      `INSERT INTO async_duel_weekly_settlements
         (week_start, winner_faction_id, reward_ryos, settled_at)
       VALUES (?, ?, ?, UTC_TIMESTAMP(6))`,
      [weekStart, winner, rewardRyos],
    );

    if (winner) {
      // Pick the last event at/before the opening instant, then test its faction. This
      // includes idle members, and does not require them to still belong to the village.
      const [ledger] = await connection.execute(
        `INSERT INTO async_duel_weekly_reward_ledger (week_start, user_id, ryos)
         SELECT ?, p.user_id, ?
         FROM player_profiles p
         JOIN async_duel_village_membership h ON h.id = (
           SELECT m.id FROM async_duel_village_membership m
           WHERE m.user_id = p.user_id AND m.effective_at <= CAST(? AS DATETIME(6))
           ORDER BY m.effective_at DESC, m.id DESC LIMIT 1
         )
         WHERE h.faction_id = ?`,
        [weekStart, rewardRyos, weekStart, winner],
      );
      const [wallets] = await connection.execute(
        `UPDATE player_profiles p
         JOIN async_duel_weekly_reward_ledger l ON l.user_id = p.user_id AND l.week_start = ?
         SET p.ryos = p.ryos + l.ryos
         WHERE p.ryos <= 2147483647 - l.ryos`,
        [weekStart],
      );
      if (wallets.affectedRows !== ledger.affectedRows) {
        throw new Error(`Could not credit every weekly village reward for ${weekStart}.`);
      }
    }

    await connection.execute(
      `UPDATE async_duel_weekly_state
       SET next_week_start = DATE_ADD(next_week_start, INTERVAL 7 DAY) WHERE id = 1`,
    );
    return true;
  });
}

export async function settleWeeklyVillageRewards() {
  let settled = 0;
  while (await settleNextWeek()) settled += 1;
  return settled;
}
