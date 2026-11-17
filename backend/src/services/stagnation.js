import { query } from '../config/database.js';
import {
  applyStagnationPenalty,
  isStagnantCandidate,
  shouldApplyStagnationPenalty,
} from './gradeProgression.js';
import { createSenseiNotification } from './senseiNotifications.js';

export async function applyStagnationForUser(userId) {
  const ninjas = await query('SELECT * FROM ninjas WHERE user_id = ?', [userId]);
  const results = [];

  for (const ninja of ninjas) {
    if (!isStagnantCandidate(ninja)) {
      if ((ninja.stagnant_cycles ?? 0) > 0) {
        await query('UPDATE ninjas SET stagnant_cycles = 0 WHERE id = ?', [ninja.id]);
      }
      continue;
    }

    if (!shouldApplyStagnationPenalty(ninja)) {
      await query('UPDATE ninjas SET stagnant_cycles = 1 WHERE id = ?', [ninja.id]);
      results.push({
        ninjaId: ninja.id,
        name: ninja.name,
        grade: ninja.grade,
        grace: true,
        reason: ninja.grade === 'Genin' ? 'genin_exam_pending' : 'chunin_departure_pending',
      });
      continue;
    }

    const { weeklyForme, moral } = applyStagnationPenalty(ninja);
    await query(
      'UPDATE ninjas SET weekly_forme = ?, moral = ?, stagnant_cycles = stagnant_cycles + 1 WHERE id = ?',
      [weeklyForme, moral, ninja.id],
    );

    results.push({
      ninjaId: ninja.id,
      name: ninja.name,
      grade: ninja.grade,
      weeklyForme,
      moral,
      grace: false,
      reason: ninja.grade === 'Genin' ? 'genin_exam_pending' : 'chunin_departure_pending',
    });
  }

  if (results.length) {
    await createSenseiNotification(userId, 'stagnation', { ninjas: results });
  }

  return results;
}

export async function applyStagnationForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const all = [];
  for (const user of users) {
    all.push(...(await applyStagnationForUser(user.id)));
  }
  return all;
}
