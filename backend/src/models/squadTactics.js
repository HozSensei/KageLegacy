import { query } from '../config/database.js';
import { meetsChuninRequirements } from '../services/chuninExam.js';
import { computeChuninExamCost, meetsBirdFlightRequirements } from '../services/gradeProgression.js';
import { assertSpendingAllowed } from '../services/economyDebt.js';
import { getGameClock, isTacticsLocked } from '../services/gameClock.js';
import { isNinjaListed } from '../services/playerMarketService.js';

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

  const activeIds = new Set(owned.map((r) => r.id));

  for (const { ninjaId, strategy, protectTargetNinjaId } of strategies) {
    if (strategy === 'Protect') {
      if (!protectTargetNinjaId) {
        const error = new Error('La consigne Protect exige un allié à couvrir.');
        error.statusCode = 400;
        throw error;
      }
      if (protectTargetNinjaId === ninjaId || !activeIds.has(protectTargetNinjaId)) {
        const error = new Error('Cible Protect invalide : choisissez un autre ninja actif.');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  for (const { ninjaId, strategy, protectTargetNinjaId } of strategies) {
    const targetId = strategy === 'Protect' ? protectTargetNinjaId : null;
    await query(
      'UPDATE ninjas SET battle_strategy = ?, protect_target_ninja_id = ? WHERE id = ? AND user_id = ?',
      [strategy, targetId, ninjaId, userId]
    );
  }

  return strategies;
}

export async function updateTrainingPlans(userId, plans) {
  if (await isTacticsLocked()) {
    const error = new Error('Les plans d\'entraînement sont gelés jusqu\'à la fin du cycle (H71).');
    error.statusCode = 423;
    throw error;
  }

  const ninjaIds = plans.map((p) => p.ninjaId);
  const placeholders = ninjaIds.map(() => '?').join(',');
  const owned = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND id IN (${placeholders})`,
    [userId, ...ninjaIds]
  );

  if (owned.length !== plans.length) {
    const error = new Error('Plans invalides : ninjas introuvables.');
    error.statusCode = 400;
    throw error;
  }

  for (const { ninjaId, trainingFocus } of plans) {
    await query('UPDATE ninjas SET training_focus = ? WHERE id = ? AND user_id = ?', [
      trainingFocus,
      ninjaId,
      userId,
    ]);
  }

  return plans;
}

/** @deprecated Utiliser updateTrainingPlans — conservé pour compat API */
export async function updateTrainingFocus(userId, trainingFocus) {
  const ninjas = await query('SELECT id FROM ninjas WHERE user_id = ?', [userId]);
  const plans = ninjas.map((n) => ({ ninjaId: n.id, trainingFocus }));
  return updateTrainingPlans(userId, plans);
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
  if (await isNinjaListed(ninjaId)) {
    const error = new Error('Ce ninja est en vente et ne peut pas s\'inscrire à l\'examen.');
    error.statusCode = 409;
    throw error;
  }

  if (!meetsChuninRequirements(ninja)) {
    const error = new Error('Prérequis non atteints (combat ≥ 10 et intelligence ≥ 8).');
    error.statusCode = 400;
    throw error;
  }

  const examCost = computeChuninExamCost(ninja);

  await assertSpendingAllowed(
    userId,
    'Gel administratif — remboursez votre dette avant d\'inscrire un Genin à l\'examen Chunin.'
  );

  if (ninja.ryos < examCost) {
    const error = new Error(`Ryos insuffisants (${examCost} requis).`);
    error.statusCode = 402;
    throw error;
  }

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [examCost, userId]);
  await query('UPDATE ninjas SET chunin_exam_requested = TRUE WHERE id = ?', [ninjaId]);

  return { ninjaId, cost: examCost };
}

export async function requestBirdFlight(userId, ninjaId) {
  const clock = await getGameClock();
  if (clock.hour >= 72 || clock.cycleComplete) {
    const error = new Error('Les inscriptions au Vol d\'Oiseau sont closes pour ce cycle.');
    error.statusCode = 423;
    throw error;
  }

  const rows = await query(
    `SELECT n.*, s.ryos
     FROM ninjas n
     JOIN sensei s ON s.user_id = n.user_id
     WHERE n.id = ? AND n.user_id = ? AND n.grade = 'Chunin'`,
    [ninjaId, userId]
  );
  const ninja = rows[0];
  if (!ninja) {
    const error = new Error('Chunin introuvable.');
    error.statusCode = 404;
    throw error;
  }

  if (ninja.bird_flight_requested) {
    const error = new Error('Ce Chunin est déjà inscrit au Vol d\'Oiseau.');
    error.statusCode = 409;
    throw error;
  }
  if (await isNinjaListed(ninjaId)) {
    const error = new Error('Ce ninja est en vente et ne peut pas s\'inscrire au Vol d\'Oiseau.');
    error.statusCode = 409;
    throw error;
  }

  if (!meetsBirdFlightRequirements(ninja)) {
    const error = new Error('Prérequis non atteints (combat ≥ 16 et intelligence ≥ 14).');
    error.statusCode = 400;
    throw error;
  }

  await query('UPDATE ninjas SET bird_flight_requested = TRUE WHERE id = ?', [ninjaId]);

  return { ninjaId };
}
