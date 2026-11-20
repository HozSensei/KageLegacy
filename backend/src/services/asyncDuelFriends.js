import { getConnection, query } from '../config/database.js';

const SEARCH_LIMIT = 20;
const PLAYER_NAME = 'COALESCE(p.character_name, p.display_name, u.username)';
const MATCH_PAIR = 'user_low_id = ? AND user_high_id = ?';

function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}

function orderedPair(userId, otherId) {
  return [Math.min(userId, otherId), Math.max(userId, otherId)];
}

function distinctPair(userId, otherId) {
  const pair = orderedPair(userId, otherId);
  if (pair[0] === pair[1]) fail(400, 'Vous ne pouvez pas vous ajouter en ami.');
  return pair;
}

export async function getDuelFriends(userId) {
  const rows = await query(
    `SELECT u.id, ${PLAYER_NAME} AS name, f.status, f.requested_by = ? AS isOutgoing
     FROM async_duel_friendships f
     JOIN users u ON u.id = IF(f.user_low_id = ?, f.user_high_id, f.user_low_id)
     LEFT JOIN player_profiles p ON p.user_id = u.id
     WHERE f.user_low_id = ? OR f.user_high_id = ?
     ORDER BY name, u.id`,
    [userId, userId, userId, userId],
  );
  const result = { friends: [], incoming: [], outgoing: [] };
  for (const { id, name, status, isOutgoing } of rows) {
    const group = status === 'accepted' ? 'friends' : isOutgoing ? 'outgoing' : 'incoming';
    result[group].push({ id, name });
  }
  return result;
}

export async function searchDuelPlayers(userId, q = '') {
  const search = q.trim().replace(/[!%_]/g, '!$&');
  if (!search) return [];
  return query(
    `SELECT u.id, ${PLAYER_NAME} AS name
     FROM users u
     LEFT JOIN player_profiles p ON p.user_id = u.id
     WHERE u.id <> ? AND ${PLAYER_NAME} LIKE ? ESCAPE '!'
     ORDER BY name, u.id
     LIMIT ${SEARCH_LIMIT}`,
    [userId, `%${search}%`],
  );
}

export async function requestDuelFriend(userId, otherId) {
  const pair = distinctPair(userId, otherId);
  try {
    await query(
      `INSERT INTO async_duel_friendships (user_low_id, user_high_id, requested_by, status, created_at)
       VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [...pair, userId],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') fail(409, 'Une relation existe déjà avec ce joueur.');
    if (error.code === 'ER_NO_REFERENCED_ROW_2') fail(404, 'Joueur introuvable.');
    throw error;
  }
}

export async function acceptDuelFriend(userId, otherId) {
  const pair = distinctPair(userId, otherId);
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    // Le verrou garde le contrôle des droits et la transition sur la même demande.
    const [[friendship]] = await connection.execute(
      `SELECT status, requested_by FROM async_duel_friendships WHERE ${MATCH_PAIR} FOR UPDATE`,
      pair,
    );
    if (!friendship) fail(404, 'Demande d’amitié introuvable.');
    if (friendship.status !== 'pending') fail(409, 'Cette demande a déjà été acceptée.');
    if (friendship.requested_by !== Number(otherId)) {
      fail(403, 'Seul le destinataire peut accepter cette demande.');
    }
    await connection.execute(
      `UPDATE async_duel_friendships SET status = 'accepted' WHERE ${MATCH_PAIR}`,
      pair,
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removeDuelFriend(userId, otherId) {
  const pair = distinctPair(userId, otherId);
  const { affectedRows } = await query(
    `DELETE FROM async_duel_friendships WHERE ${MATCH_PAIR}`,
    pair,
  );
  if (!affectedRows) fail(404, 'Relation d’amitié introuvable.');
}

export async function areDuelFriends(userId, otherId) {
  const pair = orderedPair(userId, otherId);
  if (pair[0] === pair[1]) return false;
  const rows = await query(
    `SELECT 1 FROM async_duel_friendships WHERE ${MATCH_PAIR} AND status = 'accepted'`,
    pair,
  );
  return rows.length > 0;
}
