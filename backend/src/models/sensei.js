import { query } from '../config/database.js';
import { getGameClock } from '../services/gameClock.js';

export { getGameClock };

export async function findSenseiByUserId(userId) {
  const rows = await query('SELECT * FROM sensei WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

export async function findDemoUser() {
  const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', ['demo_sensei']);
  return rows[0] || null;
}

export async function createDemoUser({
  username,
  senseiName,
  language = 'fr',
  trainingFocus = 'Genjutsu',
}) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    username,
  ]);
  const userId = userResult.insertId;

  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language, village_id)
     VALUES (?, ?, ?, 15400, 120, 100, ?, 'leaf')`,
    [userId, senseiName, trainingFocus, language],
  );

  return findDemoUser();
}

/**
 * Legacy squad payload — désactivé en V2 (escouade archivée).
 * Conservé pour compatibilité d'import ; les routes legacy ne sont plus montées.
 */
export async function getSquadPayload(_userId) {
  const err = new Error('Le système d’escouade est désactivé (Kage Legacy V2).');
  err.statusCode = 410;
  throw err;
}
