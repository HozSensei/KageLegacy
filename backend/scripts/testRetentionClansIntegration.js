/**
 * Tests d'intégration rétention + clans (scénarios prod).
 * Usage: node backend/scripts/testRetentionClansIntegration.js
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import {
  getDailySealPayload,
  openChakraSeal,
  MAX_SEAL_STACK,
  SEAL_ITEM_SLUG,
} from '../src/services/dailySealService.js';
import { listAcademyDraws } from '../src/services/academyService.js';
import { countUnconsumedItemsBySlug } from '../src/services/itemGrantService.js';
import {
  createPlayerClan,
  joinPlayerClan,
  getClanPayload,
  leavePlayerClan,
} from '../src/services/playerClanService.js';
import {
  recommendAspirantToClan,
  listClanAcademyBoard,
  recruitFromClanBoard,
} from '../src/services/clanAcademyBoardService.js';
import { addChakraDropForSealOpen } from '../src/services/clanChakraWellService.js';
import { createHeritageScroll, getHeritagePayload } from '../src/services/heritageService.js';
import { getSquadPayload } from '../src/models/sensei.js';

const TEST_USER_B = `test_clan_b_${Date.now()}`;

async function cleanupUser(username) {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  const userId = rows[0]?.id;
  if (!userId) return null;
  await query('DELETE FROM player_clan_members WHERE user_id = ?', [userId]);
  await query('DELETE FROM player_clans WHERE leader_user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
  return userId;
}

async function createTestSensei(username, ryos = 50000) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [username]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Ninjutsu', ?, 10, 100, 'fr')`,
    [userId, username, ryos]
  );
  return userId;
}

async function getDemoUserId() {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', ['demo_sensei']);
  return rows[0]?.id;
}

async function resetDemoSeals(userId) {
  await query(
    'UPDATE sensei SET last_daily_seal_grant_date = DATE_SUB(UTC_DATE(), INTERVAL 1 DAY) WHERE user_id = ?',
    [userId]
  );
  await query(
    `UPDATE user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     SET ui.consumed = TRUE
     WHERE ui.user_id = ? AND idf.slug = ? AND ui.consumed = FALSE`,
    [userId, SEAL_ITEM_SLUG]
  );
}

async function testSealStackCap(userId) {
  await resetDemoSeals(userId);
  await getDailySealPayload(userId);
  await query(
    'UPDATE sensei SET last_daily_seal_grant_date = DATE_SUB(UTC_DATE(), INTERVAL 5 DAY) WHERE user_id = ?',
    [userId]
  );
  await getDailySealPayload(userId);
  const pending = await countUnconsumedItemsBySlug(userId, SEAL_ITEM_SLUG);
  assert.equal(pending, MAX_SEAL_STACK, `seal stack capped at ${MAX_SEAL_STACK}`);
}

async function testClanBoardRecruit(userA, userB) {
  await query('DELETE FROM player_clan_members WHERE user_id IN (?, ?)', [userA, userB]);
  await query('DELETE FROM player_clans WHERE leader_user_id = ?', [userA]);

  await createPlayerClan(userA, `Integ Clan ${Date.now()}`);
  const clanA = await getClanPayload(userA);
  await joinPlayerClan(userB, clanA.clan.inviteCode);

  await query('UPDATE sensei SET clan_board_recommended_cycle = NULL WHERE user_id = ?', [userA]);
  const draws = await listAcademyDraws(userA);
  assert.ok(draws.length >= 1, 'aspirant for recommend');

  await recommendAspirantToClan(userA, draws[0].id);
  const board = await listClanAcademyBoard(userB);
  const post = board.posts.find((p) => p.posterUserId === userA && !p.recruited);
  assert.ok(post, 'ally sees board post');
  assert.ok(post.canRecruit, 'ally can recruit');

  try {
    await recommendAspirantToClan(userA, draws[0].id);
    assert.fail('second recommend same cycle should fail');
  } catch (error) {
    assert.equal(error.statusCode, 409);
  }

  try {
    await recruitFromClanBoard(userA, post.id);
    assert.fail('poster cannot recruit own recommendation');
  } catch (error) {
    assert.equal(error.statusCode, 400);
  }

  const recruited = await recruitFromClanBoard(userB, post.id);
  assert.ok(recruited.ninjaId, 'ally recruited ninja');

  const boardAfter = await listClanAcademyBoard(userB);
  const done = boardAfter.posts.find((p) => p.id === post.id);
  assert.ok(done?.recruited, 'post marked recruited');
}

async function testWellFusion(userA, userB) {
  const clan = await getClanPayload(userA);
  await query('UPDATE player_clans SET well_drops = well_capacity - 1 WHERE id = ?', [clan.clan.id]);
  const beforeB = await countUnconsumedItemsBySlug(userB, SEAL_ITEM_SLUG);
  const result = await addChakraDropForSealOpen(userA);
  assert.ok(result.fused, 'well fusion triggered');
  const afterB = await countUnconsumedItemsBySlug(userB, SEAL_ITEM_SLUG);
  assert.ok(afterB >= beforeB, 'ally received bonus seal or at cap');
}

async function testHeritageScroll(userId) {
  const before = await getHeritagePayload(userId, 'fr');
  const countBefore = before.scrolls.length;
  await createHeritageScroll(userId, {
    name: 'Test Legacy',
    taijutsu: 18,
    ninjutsu: 12,
    genjutsu: 10,
    medecine: 8,
  });
  const after = await getHeritagePayload(userId, 'fr');
  assert.equal(after.scrolls.length, countBefore + 1);
}

async function testSquadPayloadShape(userId) {
  const payload = await getSquadPayload(userId);
  assert.ok(payload.dailySeal, 'squad includes dailySeal');
  assert.ok(payload.heritage, 'squad includes heritage');
  assert.ok(payload.clan, 'squad includes clan');
  assert.ok(payload.clanBoard, 'squad includes clanBoard');
  assert.ok(Array.isArray(payload.clanBoard.posts), 'clanBoard.posts array');
}

async function testSenseiNotificationsTable() {
  const rows = await query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sensei_notifications'`
  );
  assert.equal(rows.length, 1, 'sensei_notifications table exists');
}

async function main() {
  console.log('▶ testRetentionClansIntegration…');

  const userA = await getDemoUserId();
  assert.ok(userA, 'demo_sensei required');

  await testSenseiNotificationsTable();

  const existingB = await cleanupUser(TEST_USER_B);
  if (existingB) await query('DELETE FROM users WHERE id = ?', [existingB]);

  const userB = await createTestSensei(TEST_USER_B, 50000);

  await testSealStackCap(userA);
  console.log('  ✓ sceau stack cap');

  await testHeritageScroll(userA);
  console.log('  ✓ parchemin héritage');

  await testClanBoardRecruit(userA, userB);
  console.log('  ✓ tableau clan + recrutement allié');

  await testWellFusion(userA, userB);
  console.log('  ✓ fusion puits chakra');

  await testSquadPayloadShape(userA);
  console.log('  ✓ payload /api/squad');

  const opened = await openChakraSeal(userA);
  assert.ok(opened.well?.contributed, 'seal open contributes to well when in clan');
  console.log('  ✓ sceau → puits');

  await leavePlayerClan(userB);
  await leavePlayerClan(userA);
  await cleanupUser(TEST_USER_B);

  console.log('testRetentionClansIntegration: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
