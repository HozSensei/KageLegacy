import { query } from '../config/database.js';
import { applyStagnationPenalty, isStagnant } from './gradeProgression.js';

export async function applyStagnationForUser(userId) {
  const ninjas = await query('SELECT * FROM ninjas WHERE user_id = ?', [userId]);
  const results = [];

  for (const ninja of ninjas) {
    if (!isStagnant(ninja)) continue;

    const { weeklyForme, moral } = applyStagnationPenalty(ninja);
    await query('UPDATE ninjas SET weekly_forme = ?, moral = ? WHERE id = ?', [
      weeklyForme,
      moral,
      ninja.id,
    ]);

    results.push({
      ninjaId: ninja.id,
      name: ninja.name,
      grade: ninja.grade,
      weeklyForme,
      moral,
      reason: ninja.grade === 'Genin' ? 'genin_exam_pending' : 'chunin_departure_pending',
    });
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
