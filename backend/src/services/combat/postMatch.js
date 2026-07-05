import { query } from '../../config/database.js';
import { computeMatchPv, computeMatchChakraMax } from '../ninjaStats.js';
import { FORME_DOWNGRADE } from './constants.js';
import { applyFormeToStats } from './forme.js';

export async function applyPostMatchRecovery(userId, koNinjaIds = []) {
  const koSet = new Set(koNinjaIds);
  const ninjas = await query('SELECT * FROM ninjas WHERE user_id = ?', [userId]);

  for (const ninja of ninjas) {
    const stats = applyFormeToStats(ninja);
    const maxPv = computeMatchPv(stats.taijutsu);
    const maxChakra = computeMatchChakraMax(ninja.grade, stats.ninjutsu);

    let weeklyForme = ninja.weekly_forme;
    if (koSet.has(ninja.id)) {
      weeklyForme = FORME_DOWNGRADE[ninja.weekly_forme] || ninja.weekly_forme;
    }

    await query(
      `UPDATE ninjas
       SET current_pv_match = ?, current_chakra_match = ?, weekly_forme = ?
       WHERE id = ?`,
      [maxPv, maxChakra, weeklyForme, ninja.id]
    );
  }
}

export async function applyPostMatchForMatch(homeUserId, awayUserId, koNinjaIds) {
  const homeKo = koNinjaIds.filter((k) => k.side === 'home').map((k) => k.id);
  const awayKo = koNinjaIds.filter((k) => k.side === 'away').map((k) => k.id);
  await applyPostMatchRecovery(homeUserId, homeKo);
  await applyPostMatchRecovery(awayUserId, awayKo);
}

export async function persistSenseiChakra(userId, chakraPool) {
  await query('UPDATE sensei SET chakra_pool = ? WHERE user_id = ?', [
    Math.max(0, chakraPool),
    userId,
  ]);
}
