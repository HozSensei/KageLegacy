import { query } from '../config/database.js';
import { createBotUser } from './botFactory.js';
import { buildRoundRobinSchedule, LOWEST_DIVISION, POOL_SIZE, SEASON_CYCLES } from './poolSchedule.js';

export async function findUserPool(userId) {
  const rows = await query(
    `SELECT p.* FROM pools p
     JOIN pool_members pm ON pm.pool_id = p.id
     WHERE pm.user_id = ? AND p.status = 'active'
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function addMemberToPool(poolId, userId) {
  await query('INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)', [poolId, userId]);
  await query(
    'INSERT INTO pool_standings (pool_id, user_id) VALUES (?, ?)',
    [poolId, userId]
  );
}

async function insertSchedule(poolId, memberIds) {
  const schedule = buildRoundRobinSchedule(memberIds, SEASON_CYCLES);
  for (const entry of schedule) {
    await query(
      `INSERT INTO matches (pool_id, season_cycle, home_user_id, away_user_id)
       VALUES (?, ?, ?, ?)`,
      [poolId, entry.seasonCycle, entry.homeUserId, entry.awayUserId]
    );
  }
}

async function createPoolWithBots(humanUserId) {
  const poolResult = await query(
    `INSERT INTO pools (division_level, season_number, current_cycle, status)
     VALUES (?, 1, 1, 'active')`,
    [LOWEST_DIVISION]
  );
  const poolId = poolResult.insertId;

  await addMemberToPool(poolId, humanUserId);
  const memberIds = [humanUserId];

  for (let i = 0; i < POOL_SIZE - 1; i += 1) {
    const bot = await createBotUser(poolId, i);
    await addMemberToPool(poolId, bot.userId);
    memberIds.push(bot.userId);
  }

  await insertSchedule(poolId, memberIds);
  return findUserPool(humanUserId);
}

async function replaceBotInPool(poolId, botUserId, humanUserId) {
  await query('UPDATE pool_members SET user_id = ? WHERE pool_id = ? AND user_id = ?', [
    humanUserId,
    poolId,
    botUserId,
  ]);
  await query('UPDATE pool_standings SET user_id = ? WHERE pool_id = ? AND user_id = ?', [
    humanUserId,
    poolId,
    botUserId,
  ]);
  await query('UPDATE matches SET home_user_id = ? WHERE home_user_id = ?', [humanUserId, botUserId]);
  await query('UPDATE matches SET away_user_id = ? WHERE away_user_id = ?', [humanUserId, botUserId]);
  await query('DELETE FROM ninjas WHERE user_id = ?', [botUserId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [botUserId]);
  await query('DELETE FROM users WHERE id = ? AND is_bot = TRUE', [botUserId]);
}

async function findPoolWithBotSlot(divisionLevel = LOWEST_DIVISION) {
  const rows = await query(
    `SELECT p.id AS pool_id, u.id AS bot_user_id
     FROM pools p
     JOIN pool_members pm ON pm.pool_id = p.id
     JOIN users u ON u.id = pm.user_id
     WHERE p.status = 'active'
       AND p.division_level = ?
       AND u.is_bot = TRUE
     ORDER BY p.id
     LIMIT 1`,
    [divisionLevel]
  );
  return rows[0] || null;
}

/** Algorithme join_or_create_pool (M8) */
export async function joinOrCreatePool(humanUserId) {
  const existing = await findUserPool(humanUserId);
  if (existing) return existing;

  const slot = await findPoolWithBotSlot();
  if (slot) {
    await replaceBotInPool(slot.pool_id, slot.bot_user_id, humanUserId);
    return findUserPool(humanUserId);
  }

  return createPoolWithBots(humanUserId);
}

export async function getPoolMemberIds(poolId) {
  const rows = await query(
    `SELECT pm.user_id, u.is_bot, s.name AS sensei_name
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     JOIN sensei s ON s.user_id = pm.user_id
     WHERE pm.pool_id = ?
     ORDER BY pm.id`,
    [poolId]
  );
  return rows;
}

export async function incrementPoolCycle(poolId) {
  const rows = await query('SELECT current_cycle FROM pools WHERE id = ?', [poolId]);
  const cycle = rows[0]?.current_cycle ?? 1;
  if (cycle >= SEASON_CYCLES) {
    await query(`UPDATE pools SET status = 'completed', current_cycle = ? WHERE id = ?`, [
      SEASON_CYCLES,
      poolId,
    ]);
    return { seasonEnded: true, cycle };
  }
  await query('UPDATE pools SET current_cycle = current_cycle + 1 WHERE id = ?', [poolId]);
  return { seasonEnded: false, cycle: cycle + 1 };
}

export { POOL_SIZE, SEASON_CYCLES, LOWEST_DIVISION };
