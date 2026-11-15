import { query } from '../config/database.js';
import { isCompositionLocked, isTacticsLocked } from '../services/gameClock.js';
import { isNinjaOnMission } from '../services/missionService.js';
import { isNinjaListed } from '../services/playerMarketService.js';

export async function updateSquadComposition(userId, slots) {
  if (await isCompositionLocked()) {
    const error = new Error('La composition est gelée depuis H54 jusqu\'au match (H71).');
    error.statusCode = 423;
    throw error;
  }
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

  for (const { ninjaId } of slots) {
    if (await isNinjaOnMission(ninjaId)) {
      const error = new Error('Un ninja en mission ne peut pas rejoindre l\'escouade active.');
      error.statusCode = 423;
      throw error;
    }
    if (await isNinjaListed(ninjaId)) {
      const error = new Error('Un ninja en vente ne peut pas rejoindre l\'escouade active.');
      error.statusCode = 423;
      throw error;
    }
  }

  await query('UPDATE ninjas SET squad_position = NULL, preparation_type = NULL WHERE user_id = ?', [
    userId,
  ]);

  for (const { position, ninjaId } of slots) {
    await query('UPDATE ninjas SET squad_position = ? WHERE id = ? AND user_id = ?', [
      position,
      ninjaId,
      userId,
    ]);
  }

  return slots;
}
