import { query } from '../config/database.js';
import { isTacticsLocked } from '../services/gameClock.js';

export async function updateBattleStrategies(userId, strategies) {
  if (await isTacticsLocked()) {
    const error = new Error('Les tactiques sont gelées jusqu\'à la fin du cycle (H71).');
    error.statusCode = 423;
    throw error;
  }

  const ninjaIds = strategies.map((s) => s.ninjaId);
  const placeholders = ninjaIds.map(() => '?').join(',');
  const owned = await query(
    `SELECT id FROM ninjas
     WHERE user_id = ? AND id IN (${placeholders}) AND squad_position IS NOT NULL`,
    [userId, ...ninjaIds]
  );

  if (owned.length !== strategies.length) {
    const error = new Error('Consignes invalides : ninjas actifs introuvables.');
    error.statusCode = 400;
    throw error;
  }

  for (const { ninjaId, strategy } of strategies) {
    await query('UPDATE ninjas SET battle_strategy = ? WHERE id = ? AND user_id = ?', [
      strategy,
      ninjaId,
      userId,
    ]);
  }

  return strategies;
}

export async function updateTrainingFocus(userId, trainingFocus) {
  await query('UPDATE sensei SET training_focus = ? WHERE user_id = ?', [trainingFocus, userId]);
  return trainingFocus;
}

export async function setChuninExamRequest(userId, ninjaId, requested) {
  const rows = await query(
    `SELECT id FROM ninjas WHERE id = ? AND user_id = ? AND grade = 'Genin'`,
    [ninjaId, userId]
  );
  if (!rows[0]) {
    const error = new Error('Genin introuvable.');
    error.statusCode = 404;
    throw error;
  }
  await query('UPDATE ninjas SET chunin_exam_requested = ? WHERE id = ?', [requested, ninjaId]);
  return requested;
}
