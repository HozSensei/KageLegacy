import { query } from '../config/database.js';
import { computeMatchChakraMax, computeSalaryCost, clampStat } from './ninjaStats.js';
import { meetsChuninRequirements } from './chuninExam.js';
import { createSenseiNotification } from './senseiNotifications.js';

export async function processChuninExamsForUser(userId) {
  const candidates = await query(
    `SELECT * FROM ninjas
     WHERE user_id = ? AND grade = 'Genin' AND chunin_exam_requested = TRUE`,
    [userId]
  );

  const results = [];

  for (const ninja of candidates) {
    if (meetsChuninRequirements(ninja)) {
      const salary_cost = computeSalaryCost('Chunin', ninja);
      const current_chakra_match = computeMatchChakraMax('Chunin', ninja.ninjutsu);
      await query(
        `UPDATE ninjas
         SET grade = 'Chunin', salary_cost = ?, current_chakra_match = ?, chunin_exam_requested = FALSE
         WHERE id = ?`,
        [salary_cost, current_chakra_match, ninja.id]
      );
      await createSenseiNotification(userId, 'chunin_exam_success', {
        ninjaId: ninja.id,
        name: ninja.name,
        combatStat: Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine),
        intelligence: ninja.intelligence,
      });
      results.push({ ninjaId: ninja.id, name: ninja.name, outcome: 'success' });
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
        combatStat: Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine),
        combatRequired: 10,
        intelligence: ninja.intelligence,
        intelligenceRequired: 8,
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
