import { query } from '../config/database.js';

export async function findPlayerProfileByUserId(userId) {
  const rows = await query(
    'SELECT id, user_id, display_name, language FROM player_profiles WHERE user_id = ?',
    [userId],
  );
  return rows[0] || null;
}
