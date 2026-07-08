/**
 * Tests rétention : sceau quotidien, académie rotative, héritage.
 * Usage: node backend/scripts/testRetentionSystem.js
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import { getDailySealPayload, openChakraSeal, MAX_SEAL_STACK } from '../src/services/dailySealService.js';
import { getAcademyPayload, ACADEMY_SLOT_COUNT } from '../src/services/academyService.js';
import { getHeritagePayload, getDominantStat } from '../src/services/heritageService.js';
import { resetDailyRetentionCacheForTests } from '../src/services/dailyRetentionJobs.js';

async function getDemoUserId() {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', ['demo_sensei']);
  return rows[0]?.id;
}

async function main() {
  const userId = await getDemoUserId();
  assert.ok(userId, 'demo_sensei required');

  resetDailyRetentionCacheForTests();
  await query(
    'UPDATE sensei SET last_daily_seal_grant_date = DATE_SUB(UTC_DATE(), INTERVAL 1 DAY) WHERE user_id = ?',
    [userId]
  );
  await query(
    `UPDATE user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     SET ui.consumed = TRUE
     WHERE ui.user_id = ? AND idf.slug = 'sceau-chakra' AND ui.consumed = FALSE`,
    [userId]
  );

  const seal = await getDailySealPayload(userId);
  assert.ok(seal.pending >= 1, 'first daily seal grant');
  assert.ok(seal.pending <= MAX_SEAL_STACK, 'seal stack cap');

  const opened = await openChakraSeal(userId);
  assert.ok(opened.reward?.tier, 'seal opens with a tier');
  assert.ok(['common', 'rare', 'epic', 'jackpot'].includes(opened.reward.tier));

  const academy = await getAcademyPayload(userId);
  assert.equal(academy.draws.length, ACADEMY_SLOT_COUNT, '3 academy aspirants');
  assert.ok(academy.nextRotationAt, 'rotation timestamp');

  const heritage = await getHeritagePayload(userId, 'fr');
  assert.ok(heritage.bonuses, 'heritage bonuses object');

  const mockNinja = { taijutsu: 12, ninjutsu: 18, genjutsu: 10, medecine: 8 };
  assert.equal(getDominantStat(mockNinja), 'ninjutsu');

  console.log('testRetentionSystem: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
