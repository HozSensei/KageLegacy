/**
 * Remet un personnage à l’état post-inscription (progression, pas le compte).
 */
import { getConnection } from '../config/database.js';
import { STARTING_RYOS } from '../config/economyConfig.js';
import { ASPIRANT_RANK, DEFAULT_AVATAR_ID } from './characterAppearance.js';
import { ensureStarterLoadout } from './starterLoadoutService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * @param {number} userId
 * @returns {Promise<{ success: true, starter: object }>}
 */
export async function resetCharacterToFreshState(userId) {
  if (!Number.isSafeInteger(userId) || userId < 1) {
    throw httpError(400, 'Identifiant joueur invalide.');
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [players] = await connection.execute(
      `SELECT u.id FROM users u
       JOIN player_profiles s ON s.user_id = u.id
       WHERE u.id = ? AND u.is_guest = FALSE
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    if (!players[0]) {
      throw httpError(404, 'Joueur introuvable.');
    }

    await connection.execute('DELETE FROM combat_sessions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM mission_runs WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_decks WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_card_collection WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_talents WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_talent_respec_history WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_battle_pass_quests WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_battle_pass WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_onboarding WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_achievements WHERE user_id = ?', [userId]);

    await connection.execute('DELETE FROM pvp_queue WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM pvp_invites WHERE user_id = ?', [userId]);
    await connection.execute(
      `DELETE FROM pvp_matches
       WHERE host_user_id = ? OR guest_user_id = ?`,
      [userId, userId],
    );

    await connection.execute(
      `UPDATE player_profiles
       SET ryos = ?,
           kage_coins = 0,
           card_dust = 0,
           card_essence = 0,
           character_level = 1,
           character_xp = 0,
           character_highest_level = 1,
           character_rank = ?,
           character_talent_points_available = 1,
           character_avatar_id = IF(
             character_avatar_id LIKE 'aspirant-%',
             character_avatar_id,
             ?
           ),
           character_nickname_id = NULL,
           character_updated_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND character_name IS NOT NULL`,
      [STARTING_RYOS, ASPIRANT_RANK, DEFAULT_AVATAR_ID, userId],
    );

    await connection.execute(
      'UPDATE users SET starter_loadout_reset_at = NULL WHERE id = ?',
      [userId],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const starter = await ensureStarterLoadout(userId);
  return { success: true, starter };
}
