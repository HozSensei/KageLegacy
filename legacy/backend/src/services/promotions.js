import { query } from '../config/database.js';
import { computeMatchChakraMax, computeSalaryCost, clampStat, ninjaOverallRating } from './ninjaStats.js';
import { meetsChuninRequirements, CHUNIN_AVERAGE_REQUIRED } from './chuninExam.js';
import { computeChuninPromotionRewards } from './chuninPromotionRewards.js';
import { grantItemToUser } from './itemGrantService.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { recordCycleObjectiveEvent } from './cycleObjectiveService.js';
import { recordVillageScore } from './villageService.js';
import { isNinjaOnMission } from './missionService.js';
import { isNinjaListed } from './playerMarketService.js';

/**
 * Après promotion Genin→Chunin : le ninja quitte l'escouade active (banc).
 * Si un slot a été libéré, un Genin du banc disponible le reprend.
 */
export async function leaveActiveSquadAfterChuninPromotion(userId, ninja) {
  const vacatedPosition = ninja.squad_position ?? null;
  if (!vacatedPosition) {
    return { leftActiveSquad: false, vacatedPosition: null, replacement: null };
  }

  await query(
    'UPDATE ninjas SET squad_position = NULL, preparation_type = NULL WHERE id = ? AND user_id = ?',
    [ninja.id, userId]
  );

  const candidates = await query(
    `SELECT id, name FROM ninjas
     WHERE user_id = ? AND grade = 'Genin' AND squad_position IS NULL AND id != ?
     ORDER BY id ASC`,
    [userId, ninja.id]
  );

  for (const candidate of candidates) {
    if (await isNinjaOnMission(candidate.id)) continue;
    if (await isNinjaListed(candidate.id)) continue;
    await query('UPDATE ninjas SET squad_position = ? WHERE id = ? AND user_id = ?', [
      vacatedPosition,
      candidate.id,
      userId,
    ]);
    return {
      leftActiveSquad: true,
      vacatedPosition,
      replacement: { id: candidate.id, name: candidate.name },
    };
  }

  return { leftActiveSquad: true, vacatedPosition, replacement: null };
}

export async function processChuninExamsForUser(userId) {
  const candidates = await query(
    `SELECT * FROM ninjas
     WHERE user_id = ? AND grade = 'Genin' AND chunin_exam_requested = TRUE`,
    [userId]
  );

  const results = [];

  for (const ninja of candidates) {
    if (meetsChuninRequirements(ninja)) {
      const rewards = computeChuninPromotionRewards(ninja);
      const salary_cost = computeSalaryCost('Chunin', ninja);
      const current_chakra_match = computeMatchChakraMax('Chunin', ninja.ninjutsu);
      const grantedItems = await grantItemToUser(userId, rewards.itemSlug, 1);

      await query(
        `UPDATE ninjas
         SET grade = 'Chunin',
             salary_cost = ?,
             current_chakra_match = ?,
             chunin_exam_requested = FALSE,
             moral = ?,
             weekly_forme = ?
         WHERE id = ?`,
        [salary_cost, current_chakra_match, rewards.newMoral, rewards.newForme, ninja.id]
      );

      const squadUpdate = await leaveActiveSquadAfterChuninPromotion(userId, ninja);

      await query(
        'UPDATE sensei SET ryos = ryos + ?, reputation = reputation + ? WHERE user_id = ?',
        [rewards.ryos, rewards.reputation, userId]
      );

      await createSenseiNotification(userId, 'chunin_exam_success', {
        ninjaId: ninja.id,
        name: ninja.name,
        overallRating: ninjaOverallRating(ninja),
        ryosReward: rewards.ryos,
        reputationReward: rewards.reputation,
        itemSlug: rewards.itemSlug,
        moralAfter: rewards.newMoral,
        formeAfter: rewards.newForme,
        moralBoost: rewards.moralBoost,
        leftActiveSquad: squadUpdate.leftActiveSquad,
        vacatedPosition: squadUpdate.vacatedPosition,
        replacementName: squadUpdate.replacement?.name || null,
        replacementId: squadUpdate.replacement?.id || null,
      });
      await recordCycleObjectiveEvent(userId, 'chunin_promote');
      await recordVillageScore(userId, 'chunin_success');

      results.push({
        ninjaId: ninja.id,
        name: ninja.name,
        outcome: 'success',
        rewards: { ...rewards, itemGranted: grantedItems.length > 0 },
        leftActiveSquad: squadUpdate.leftActiveSquad,
        replacementId: squadUpdate.replacement?.id || null,
        replacementName: squadUpdate.replacement?.name || null,
      });
    } else {
      const moral = clampStat(ninja.moral - 5);
      await query(
        'UPDATE ninjas SET moral = ?, chunin_exam_requested = FALSE WHERE id = ?',
        [moral, ninja.id]
      );
      await createSenseiNotification(userId, 'chunin_exam_failure', {
        ninjaId: ninja.id,
        name: ninja.name,
        moral,
        overallRating: ninjaOverallRating(ninja),
        averageRequired: CHUNIN_AVERAGE_REQUIRED,
      });
      results.push({ ninjaId: ninja.id, name: ninja.name, outcome: 'failure', moral });
    }
  }

  return results;
}

export async function processChuninExamsForAllUsers() {
  const users = await query('SELECT id FROM users');
  const all = [];
  for (const user of users) {
    all.push(...(await processChuninExamsForUser(user.id)));
  }
  return all;
}
