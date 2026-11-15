import { query } from '../config/database.js';
import { isTacticsLocked } from './gameClock.js';
import { isNinjaListed } from './playerMarketService.js';

export const MIN_ROSTER_SIZE = 3;

async function assertHumanPlayer(userId) {
  const rows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  if (rows[0]?.is_bot) {
    const error = new Error('Action non disponible pour les comptes bots.');
    error.statusCode = 403;
    throw error;
  }
}

export async function assertNinjaReleasable(userId, ninjaId) {
  if (await isTacticsLocked()) {
    const error = new Error('Libération suspendue pendant l\'opération (à partir de H71).');
    error.statusCode = 423;
    throw error;
  }

  const ninjaRows = await query('SELECT n.* FROM ninjas n WHERE n.id = ? AND n.user_id = ?', [
    ninjaId,
    userId,
  ]);
  const ninja = ninjaRows[0];
  if (!ninja) {
    const error = new Error('Ninja introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (ninja.squad_position !== null) {
    const error = new Error(
      'Retirez ce ninja de l\'escouade active (banc) avant de le libérer — seuls les remplaçants peuvent partir.'
    );
    error.statusCode = 400;
    throw error;
  }
  if (ninja.chunin_exam_requested || ninja.bird_flight_requested) {
    const error = new Error('Retirez ce ninja des examens avant de le libérer.');
    error.statusCode = 409;
    throw error;
  }
  if (await isNinjaListed(ninjaId)) {
    const error = new Error('Retirez ce ninja de la vente avant de le libérer.');
    error.statusCode = 409;
    throw error;
  }

  const missionRows = await query(
    `SELECT id FROM idle_missions WHERE ninja_id = ? AND status = 'active'`,
    [ninjaId]
  );
  if (missionRows.length) {
    const error = new Error('Ce ninja est en mission.');
    error.statusCode = 409;
    throw error;
  }

  const countRows = await query('SELECT COUNT(*) AS c FROM ninjas WHERE user_id = ?', [userId]);
  if (Number(countRows[0]?.c ?? 0) <= MIN_ROSTER_SIZE) {
    const error = new Error(
      `Effectif minimum : conservez au moins ${MIN_ROSTER_SIZE} ninjas dans votre équipe.`
    );
    error.statusCode = 400;
    throw error;
  }

  return ninja;
}

export async function releaseNinja(userId, ninjaId) {
  await assertHumanPlayer(userId);
  const ninja = await assertNinjaReleasable(userId, ninjaId);

  await query('DELETE FROM ninjas WHERE id = ? AND user_id = ?', [ninjaId, userId]);

  return { ninjaId, name: ninja.name };
}
