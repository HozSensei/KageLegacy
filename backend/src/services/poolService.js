import { query } from '../config/database.js';
import { createBotUser } from './botFactory.js';
import {
  buildRoundRobinSchedule,
  LOWEST_DIVISION,
  POOL_SIZE,
  SEASON_CYCLES,
  validateRoundRobinSchedule,
} from './poolSchedule.js';
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
  await query(
    'DELETE FROM reconnaissance_missions WHERE home_user_id = ? OR away_user_id = ?',
    [botUserId, botUserId]
  );
  await query(
    `DELETE FROM reconnaissance_challenges
     WHERE challenger_user_id = ? OR defender_user_id = ?`,
    [botUserId, botUserId]
  );
  await query('DELETE FROM reconnaissance_registrations WHERE user_id = ?', [botUserId]);
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
    `UPDATE matches SET home_user_id = ? WHERE pool_id = ? AND home_user_id = ?`,
    [humanUserId, poolId, botUserId]
  );
  await query(
    `UPDATE matches SET away_user_id = ? WHERE pool_id = ? AND away_user_id = ?`,
    [humanUserId, poolId, botUserId]
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
export async function joinOrCreatePool(humanUserId, { seasonNumber = 1 } = {}) {
  const existing = await findUserPool(humanUserId);
  if (existing) return existing;

  const slot = await findPoolWithBotSlot();
  if (slot) {
    await replaceBotInPool(slot.pool_id, slot.bot_user_id, humanUserId);
    return findUserPool(humanUserId);
  }

  return createPoolWithBots(humanUserId, { seasonNumber });
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

/**
 * Réaligne les confrontations d'une ligue sur un round-robin valide
 * (même ordre de membres qu'à la création, via pool_members.id).
 */
export async function repairPoolSchedule(poolId, { onlyScheduled = true } = {}) {
  const members = await getPoolMemberIds(poolId);
  if (members.length < 2 || members.length % 2 !== 0) {
    const error = new Error('Nombre de membres invalide pour un round-robin.');
    error.statusCode = 400;
    throw error;
  }

  const memberIds = members.map((member) => member.user_id);
  const expected = buildRoundRobinSchedule(memberIds, SEASON_CYCLES);
  if (!validateRoundRobinSchedule(expected, memberIds.length)) {
    const error = new Error('Calendrier round-robin généré invalide.');
    error.statusCode = 500;
    throw error;
  }

  const rows = await query(
    `SELECT id, season_cycle, home_user_id, away_user_id, status
     FROM matches
     WHERE pool_id = ?
     ORDER BY season_cycle ASC, id ASC`,
    [poolId]
  );

  const expectedByCycle = new Map();
  for (const entry of expected) {
    if (!expectedByCycle.has(entry.seasonCycle)) {
      expectedByCycle.set(entry.seasonCycle, []);
    }
    expectedByCycle.get(entry.seasonCycle).push(entry);
  }

  const existingByCycle = new Map();
  for (const row of rows) {
    if (!existingByCycle.has(row.season_cycle)) {
      existingByCycle.set(row.season_cycle, []);
    }
    existingByCycle.get(row.season_cycle).push(row);
  }

  let updated = 0;
  let skipped = 0;

  for (const [cycle, cycleExpected] of expectedByCycle) {
    const cycleExisting = existingByCycle.get(cycle) || [];
    if (cycleExisting.length !== cycleExpected.length) {
      const error = new Error(
        `Journée ${cycle} : ${cycleExisting.length} match(s) en base, ${cycleExpected.length} attendu(s).`
      );
      error.statusCode = 409;
      throw error;
    }

    for (let i = 0; i < cycleExpected.length; i += 1) {
      const target = cycleExpected[i];
      const row = cycleExisting[i];
      const samePairing =
        row.home_user_id === target.homeUserId && row.away_user_id === target.awayUserId;

      if (samePairing) continue;

      if (onlyScheduled && row.status !== 'scheduled') {
        skipped += 1;
        continue;
      }

      await query('UPDATE matches SET home_user_id = ?, away_user_id = ? WHERE id = ?', [
        target.homeUserId,
        target.awayUserId,
        row.id,
      ]);
      updated += 1;
    }
  }

  return { poolId, updated, skipped, memberCount: memberIds.length };
}

export async function repairAllActivePoolSchedules(options = {}) {
  const pools = await query(`SELECT id FROM pools WHERE status = 'active' ORDER BY id ASC`);
  const results = [];

  for (const pool of pools) {
    try {
      results.push({ ...(await repairPoolSchedule(pool.id, options)), ok: true });
    } catch (error) {
      results.push({
        poolId: pool.id,
        ok: false,
        error: error.message,
      });
    }
  }

  return results;
}

export { POOL_SIZE, SEASON_CYCLES, LOWEST_DIVISION, validateRoundRobinSchedule };
