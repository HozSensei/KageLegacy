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

export async function createDemoUser({ username, senseiName, specialty = 'Genjutsu', language = 'fr' }) {
  const userResult = await query(
    'INSERT INTO users (username, is_bot) VALUES (?, FALSE)',
    [username]
  );
  const userId = userResult.insertId;

  await query(
    `INSERT INTO sensei (user_id, name, specialty, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, ?, ?, 15400, 120, 100, ?)`,
    [userId, senseiName, specialty, specialty, language]
  );

  return findDemoUser();
}

export async function getSquadPayload(userId) {
  const senseiRows = await query('SELECT * FROM sensei WHERE user_id = ?', [userId]);
  const sensei = senseiRows[0];
  if (!sensei) return null;

  const userRows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  const ninjas = await query(
    `SELECT n.*, c.name AS clan_name
     FROM ninjas n
     JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.user_id = ?
     ORDER BY n.squad_position IS NULL, n.squad_position, n.id`,
    [userId]
  );

  const activeSquad = ninjas.filter((n) => n.squad_position !== null);
  const bench = ninjas.filter((n) => n.squad_position === null);

  return {
    is_bot: Boolean(userRows[0]?.is_bot),
    sensei: {
      name: sensei.name,
      specialty: sensei.specialty,
      trainingFocus: sensei.training_focus,
      ryos: sensei.ryos,
      reputation: sensei.reputation,
      chakraPool: sensei.chakra_pool,
      language: sensei.language,
    },
    activeSquad,
    bench,
  };
}
