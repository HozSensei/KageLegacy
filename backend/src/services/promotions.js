import { query } from '../config/database.js';
import { computeMatchChakraMax, computeSalaryCost, clampStat, ninjaOverallRating } from './ninjaStats.js';
import { meetsChuninRequirements, CHUNIN_AVERAGE_REQUIRED } from './chuninExam.js';
import { computeChuninPromotionRewards } from './chuninPromotionRewards.js';
import { grantItemToUser } from './itemGrantService.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { recordCycleObjectiveEvent } from './cycleObjectiveService.js';

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
      });
      await recordCycleObjectiveEvent(userId, 'chunin_promote');

      results.push({
        ninjaId: ninja.id,
        name: ninja.name,
        outcome: 'success',
        rewards: { ...rewards, itemGranted: grantedItems.length > 0 },
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
