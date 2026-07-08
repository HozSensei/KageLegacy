import { query } from '../config/database.js';
import { assertSpendingAllowed } from './economyDebt.js';
import { isTacticsLocked } from './gameClock.js';
import { getHeritageBonuses, applyPercentDiscount } from './heritageService.js';

const DISPENSARY_COST = {
  Genin: 500,
  Chunin: 1500,
};

export function getDispensaryCost(grade) {
  return DISPENSARY_COST[grade] ?? null;
}

export async function treatNinjaAtDispensary(userId, ninjaId) {
  if (await isTacticsLocked()) {
    const error = new Error('Le dispensaire est fermé pendant l\'opération (à partir de H71).');
    error.statusCode = 423;
    throw error;
  }

  const rows = await query(
    `SELECT n.*, s.ryos
     FROM ninjas n
     JOIN sensei s ON s.user_id = n.user_id
     WHERE n.id = ? AND n.user_id = ?`,
    [ninjaId, userId]
  );
  const ninja = rows[0];
  if (!ninja) {
    const error = new Error('Ninja introuvable.');
    error.statusCode = 404;
    throw error;
  }

  if (ninja.weekly_forme !== 'Lamentable') {
    const error = new Error('Seuls les ninjas en forme Lamentable peuvent être soignés au dispensaire.');
    error.statusCode = 400;
    throw error;
  }

  if (ninja.forme_lock_cycles > 0) {
    const error = new Error('Ce ninja est sous surveillance médicale prolongée (blessure grave de mission).');
    error.statusCode = 400;
    throw error;
  }

  const heritage = await getHeritageBonuses(userId);
  const baseCost = getDispensaryCost(ninja.grade);
  const discounted = applyPercentDiscount(baseCost, heritage.dispensaryDiscountPct);
  const cost = Math.max(0, discounted - (ninja.injury_discount_ryos || 0));
  if (!cost) {
    const error = new Error('Ce grade ne peut pas être traité au dispensaire.');
    error.statusCode = 400;
    throw error;
  }

  await assertSpendingAllowed(
    userId,
    'Gel administratif — remboursez votre dette avant d\'utiliser le dispensaire.'
  );

  if (ninja.ryos < cost) {
    const error = new Error(`Ryos insuffisants (${cost} requis).`);
    error.statusCode = 402;
    throw error;
  }

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [cost, userId]);
  await query(
    'UPDATE ninjas SET weekly_forme = ?, injury_discount_ryos = 0 WHERE id = ?',
    ['Passable', ninjaId]
  );

  return { ninjaId, cost, previousForme: 'Lamentable', newForme: 'Passable' };
}

export async function listDispensaryCandidates(userId) {
  const ninjas = await query(
    `SELECT id, name, grade, weekly_forme FROM ninjas
     WHERE user_id = ? AND weekly_forme = 'Lamentable'
     ORDER BY squad_position IS NULL, squad_position, id`,
    [userId]
  );
  return ninjas
    .map((n) => ({
      ...n,
      cost: getDispensaryCost(n.grade),
    }))
    .filter((n) => n.cost != null);
}
