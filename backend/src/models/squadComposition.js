import { query } from '../config/database.js';
import { isTacticsLocked } from '../services/gameClock.js';

export async function updateSquadComposition(userId, slots) {
  if (await isTacticsLocked()) {
    const error = new Error('La composition est gelée jusqu\'à la fin du cycle (H71).');
    error.statusCode = 423;
    throw error;
  }

  const ninjaIds = slots.map((s) => s.ninjaId);
  const placeholders = ninjaIds.map(() => '?').join(',');
  const owned = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND id IN (${placeholders})`,
    [userId, ...ninjaIds]
  );

  if (owned.length !== 3) {
    const error = new Error('Composition invalide : ninjas introuvables.');
    error.statusCode = 400;
    throw error;
  }

  await query('UPDATE ninjas SET squad_position = NULL WHERE user_id = ?', [userId]);

  for (const { position, ninjaId } of slots) {
    await query('UPDATE ninjas SET squad_position = ? WHERE id = ? AND user_id = ?', [
      position,
      ninjaId,
      userId,
    ]);
  }

  return slots;
}
