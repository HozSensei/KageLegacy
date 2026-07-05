import { query } from '../config/database.js';
import { meetsChuninRequirements } from '../services/chuninExam.js';
import { computeChuninExamCost } from '../services/gradeProgression.js';
import { getGameClock, isTacticsLocked } from '../services/gameClock.js';

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

export async function requestChuninExam(userId, ninjaId) {
  const clock = await getGameClock();
  if (clock.hour >= 36) {
    const error = new Error('Les inscriptions sont closes jusqu\'au prochain cycle (après H36).');
    error.statusCode = 423;
    throw error;
  }

  const rows = await query(
    `SELECT n.*, s.ryos
     FROM ninjas n
     JOIN sensei s ON s.user_id = n.user_id
     WHERE n.id = ? AND n.user_id = ? AND n.grade = 'Genin'`,
    [ninjaId, userId]
  );
  const ninja = rows[0];
  if (!ninja) {
    const error = new Error('Genin introuvable.');
    error.statusCode = 404;
    throw error;
  }

  if (ninja.chunin_exam_requested) {
    const error = new Error('Ce Genin est déjà inscrit à l\'examen.');
    error.statusCode = 409;
    throw error;
  }

  if (!meetsChuninRequirements(ninja)) {
    const error = new Error('Prérequis non atteints (combat ≥ 10 et QI ≥ 8).');
    error.statusCode = 400;
    throw error;
  }

  const examCost = computeChuninExamCost(ninja);

  if (ninja.ryos < examCost) {
    const error = new Error(`Ryos insuffisants (${examCost} requis).`);
    error.statusCode = 402;
    throw error;
  }

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [examCost, userId]);
  await query('UPDATE ninjas SET chunin_exam_requested = TRUE WHERE id = ?', [ninjaId]);

  return { ninjaId, cost: examCost };
}
