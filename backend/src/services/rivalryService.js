/**
 * Rivalités de pool : némésis après 2 défaites consécutives face au même Sensei.
 */

import { query } from '../config/database.js';

const NEMESIS_THRESHOLD = 2;

export async function recordRivalryResult(userId, rivalUserId, poolId, outcome) {
  if (!userId || !rivalUserId || userId === rivalUserId) return null;

  const rows = await query(
    `SELECT * FROM sensei_rivalries
     WHERE user_id = ? AND rival_user_id = ? AND pool_id = ?`,
    [userId, rivalUserId, poolId],
  );

  let consecutiveLosses = 0;
  let isNemesis = false;

  if (outcome === 'loss') {
    consecutiveLosses = (rows[0]?.consecutive_losses || 0) + 1;
    isNemesis = consecutiveLosses >= NEMESIS_THRESHOLD;
  } else {
    consecutiveLosses = 0;
    isNemesis = false;
  }

  await query(
    `INSERT INTO sensei_rivalries
       (user_id, rival_user_id, pool_id, consecutive_losses, is_nemesis, last_result)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       consecutive_losses = VALUES(consecutive_losses),
       is_nemesis = VALUES(is_nemesis),
       last_result = VALUES(last_result)`,
    [userId, rivalUserId, poolId, consecutiveLosses, isNemesis ? 1 : 0, outcome],
  );

  return { consecutiveLosses, isNemesis, becameNemesis: isNemesis && consecutiveLosses === NEMESIS_THRESHOLD };
}

export async function getNemesesForUser(userId, poolId = null) {
  const params = [userId];
  let sql = `
    SELECT r.*, s.name AS rival_name, u.is_bot AS rival_is_bot
    FROM sensei_rivalries r
    JOIN sensei s ON s.user_id = r.rival_user_id
    JOIN users u ON u.id = r.rival_user_id
    WHERE r.user_id = ? AND r.is_nemesis = 1`;
  if (poolId) {
    sql += ' AND r.pool_id = ?';
    params.push(poolId);
  }
  sql += ' ORDER BY r.consecutive_losses DESC, r.updated_at DESC';
  return query(sql, params);
}

export async function getRivalryPayload(userId, poolId) {
  const nemeses = await getNemesesForUser(userId, poolId);
  return {
    nemeses: nemeses.map((n) => ({
      rivalUserId: n.rival_user_id,
      rivalName: n.rival_name,
      rivalIsBot: Boolean(n.rival_is_bot),
      consecutiveLosses: n.consecutive_losses,
      lastResult: n.last_result,
    })),
  };
}
