import { query } from '../config/database.js';

export async function getUserLanguage(userId) {
  const rows = await query('SELECT language FROM sensei WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0]?.language || 'fr';
}
