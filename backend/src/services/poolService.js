import { query } from '../config/database.js';
import { createBotUser } from './botFactory.js';
import { buildRoundRobinSchedule, LOWEST_DIVISION, POOL_SIZE, SEASON_CYCLES } from './poolSchedule.js';
import { pickEnvironmentModifier } from './matchEnvironment.js';

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
    const env = pickEnvironmentModifier();
    await query(
      `INSERT INTO matches (pool_id, season_cycle, home_user_id, away_user_id, environment_slug, environment_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [poolId, entry.seasonCycle, entry.homeUserId, entry.awayUserId, env.slug, env.type]
    );
  }
}

async function createPoolWithBots(
  humanUserId,
  { divisionLevel = LOWEST_DIVISION, seasonNumber = 1 } = {}
) {
  const poolResult = await query(
    `INSERT INTO pools (division_level, season_number, current_cycle, status)
     VALUES (?, ?, 1, 'active')`,
    [divisionLevel, seasonNumber]
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
  await query(
    `UPDATE matches SET home_user_id = ? WHERE home_user_id = ?`,
    [humanUserId, botUserId]
  );
  await query(
    `UPDATE matches SET away_user_id = ? WHERE away_user_id = ?`,
    [humanUserId, botUserId]
  );
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

async function findBotInPool(poolId) {
  const rows = await query(
    `SELECT u.id AS bot_user_id
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pool_id = ? AND u.is_bot = TRUE
     LIMIT 1`,
    [poolId]
  );
  return rows[0] || null;
}

export async function removeMemberFromPool(poolId, userId) {
  await query('DELETE FROM pool_members WHERE pool_id = ? AND user_id = ?', [poolId, userId]);
}

export async function deleteBotsFromPool(poolId) {
  const bots = await query(
    `SELECT u.id
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pool_id = ? AND u.is_bot = TRUE`,
    [poolId]
  );

  for (const bot of bots) {
    await query('DELETE FROM pool_members WHERE pool_id = ? AND user_id = ?', [poolId, bot.id]);
    await query('DELETE FROM pool_standings WHERE pool_id = ? AND user_id = ?', [poolId, bot.id]);
    await query('DELETE FROM ninjas WHERE user_id = ?', [bot.id]);
    await query('DELETE FROM sensei WHERE user_id = ?', [bot.id]);
    await query('DELETE FROM users WHERE id = ?', [bot.id]);
  }

  return bots.length;
}

/** Place un joueur dans une division (remplace un bot ou crée une pool). */
export async function assignUserToDivision(userId, divisionLevel, { seasonNumber = 1 } = {}) {
  const existing = await findUserPool(userId);
  if (existing) return existing;

  const slot = await findPoolWithBotSlot(divisionLevel);
  if (slot) {
    await replaceBotInPool(slot.pool_id, slot.bot_user_id, userId);
    return findUserPool(userId);
  }

  return createPoolWithBots(userId, { divisionLevel, seasonNumber });
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

/**
 * Inscription via lien d'invitation (?invitePoolId=).
 * Si la pool est pleine, bascule sur join_or_create_pool.
 */
export async function joinPoolByInvite(humanUserId, invitePoolId) {
  const existing = await findUserPool(humanUserId);
  if (existing) {
    return { pool: existing, fallback: false, reason: 'already_in_pool' };
  }

  const poolId = Number(invitePoolId);
  if (!poolId) {
    const pool = await joinOrCreatePool(humanUserId);
    return { pool, fallback: true, reason: 'invalid_invite' };
  }

  const poolRows = await query('SELECT * FROM pools WHERE id = ? AND status = ?', [
    poolId,
    'active',
  ]);
  if (!poolRows[0]) {
    const pool = await joinOrCreatePool(humanUserId);
    return { pool, fallback: true, reason: 'pool_not_found' };
  }

  const slot = await findBotInPool(poolId);
  if (slot) {
    await replaceBotInPool(poolId, slot.bot_user_id, humanUserId);
    return { pool: await findUserPool(humanUserId), fallback: false, reason: 'invited' };
  }

  const pool = await joinOrCreatePool(humanUserId);
  return { pool, fallback: true, reason: 'pool_full' };
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
    return { poolId, seasonEnded: true, cycle };
  }
  await query('UPDATE pools SET current_cycle = current_cycle + 1 WHERE id = ?', [poolId]);
  return { poolId, seasonEnded: false, cycle: cycle + 1 };
}

export { POOL_SIZE, SEASON_CYCLES, LOWEST_DIVISION };
