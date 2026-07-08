import { query } from '../config/database.js';
import { createBotUser } from './botFactory.js';
import { findUserByUsername, verifyPassword } from './authService.js';

async function verifyDeletePassword(user, password) {
  if (user.is_guest) return;
  if (!password) {
    const err = new Error('Mot de passe requis pour supprimer le compte.');
    err.statusCode = 400;
    throw err;
  }
  const row = await findUserByUsername(user.username);
  if (!row?.password_hash || !verifyPassword(password, row.password_hash)) {
    const err = new Error('Mot de passe incorrect.');
    err.statusCode = 401;
    throw err;
  }
}

async function replaceHumanWithBotInPool(poolId, humanUserId) {
  const standings = await query(
    'SELECT points, played, wins, draws, losses FROM pool_standings WHERE pool_id = ? AND user_id = ? LIMIT 1',
    [poolId, humanUserId]
  );
  const standing = standings[0] || {
    points: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  };

  const memberCount = await query(
    'SELECT COUNT(*) AS total FROM pool_members WHERE pool_id = ?',
    [poolId]
  );
  const slotIndex = Number(memberCount[0]?.total || 0);
  const { userId: botId } = await createBotUser(poolId, slotIndex);

  await query('UPDATE matches SET home_user_id = ? WHERE home_user_id = ?', [botId, humanUserId]);
  await query('UPDATE matches SET away_user_id = ? WHERE away_user_id = ?', [botId, humanUserId]);
  await query('UPDATE matches SET winner_user_id = NULL WHERE winner_user_id = ?', [humanUserId]);

  await query('DELETE FROM pool_members WHERE pool_id = ? AND user_id = ?', [poolId, humanUserId]);
  await query('INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)', [poolId, botId]);

  await query('DELETE FROM pool_standings WHERE pool_id = ? AND user_id = ?', [poolId, humanUserId]);
  await query(
    `INSERT INTO pool_standings (pool_id, user_id, points, played, wins, draws, losses)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [poolId, botId, standing.points, standing.played, standing.wins, standing.draws, standing.losses]
  );
}

export async function deleteUserAccount(user, { password } = {}) {
  if (user.is_bot) {
    const err = new Error('Ce compte ne peut pas être supprimé.');
    err.statusCode = 403;
    throw err;
  }

  await verifyDeletePassword(user, password);

  await query(
    `UPDATE player_listings SET status = 'cancelled'
     WHERE seller_user_id = ? AND status = 'active'`,
    [user.id]
  );

  await query(
    `UPDATE ninjas SET protect_target_ninja_id = NULL
     WHERE protect_target_ninja_id IN (
       SELECT id FROM (SELECT id FROM ninjas WHERE user_id = ?) AS targets
     )`,
    [user.id]
  );

  const poolRows = await query(
    `SELECT p.id AS pool_id FROM pools p
     JOIN pool_members pm ON pm.pool_id = p.id
     WHERE pm.user_id = ? AND p.status = 'active'
     LIMIT 1`,
    [user.id]
  );

  if (poolRows[0]) {
    await replaceHumanWithBotInPool(poolRows[0].pool_id, user.id);
  } else {
    await query('DELETE FROM matches WHERE home_user_id = ? OR away_user_id = ?', [user.id, user.id]);
  }

  await query('DELETE FROM user_sessions WHERE user_id = ?', [user.id]);
  await query('DELETE FROM users WHERE id = ?', [user.id]);

  return { ok: true };
}
