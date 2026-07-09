/**
 * Tests suppression compte invité en ligue (remplacement bot).
 * Usage: node backend/scripts/testAccountDeletionGuest.js
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import { registerGuestUser } from '../src/services/authService.js';
import { deleteUserAccount } from '../src/services/accountDeletionService.js';
import { findUserPool } from '../src/services/poolService.js';
import { findAvailableBotSlotIndex } from '../src/services/botFactory.js';

const PREFIX = `test_guest_del_${Date.now()}`;

async function cleanupGuestArtifacts(userId) {
  if (!userId) return;
  await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
  await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
  await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function testGuestDeletionReplacesWithBot() {
  const { user } = await registerGuestUser({ senseiName: `${PREFIX}_sensei` });
  const pool = await findUserPool(user.id);
  assert.ok(pool, 'guest joined a pool');

  const beforeCount = await query(
    'SELECT COUNT(*) AS cnt FROM pool_members WHERE pool_id = ?',
    [pool.id]
  );
  const memberCountBefore = Number(beforeCount[0]?.cnt ?? 0);
  assert.ok(memberCountBefore >= 1, 'guest is in a non-empty pool');

  await deleteUserAccount(user, {});

  const userRows = await query('SELECT id FROM users WHERE id = ?', [user.id]);
  assert.equal(userRows.length, 0, 'guest user deleted');

  const members = await query(
    `SELECT pm.user_id, u.is_bot
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pool_id = ?`,
    [pool.id]
  );
  assert.equal(members.length, memberCountBefore, 'pool size unchanged');
  assert.ok(
    !members.some((member) => Number(member.user_id) === user.id),
    'guest removed from pool'
  );
  const botCount = members.filter((member) => member.is_bot || Number(member.is_bot) === 1).length;
  assert.ok(botCount >= 1, 'pool has at least one bot after replacement');
}

async function testFindAvailableSlotSkipsExistingUsernames() {
  const poolRows = await query(
    `SELECT id FROM pools WHERE status = 'active' ORDER BY id LIMIT 1`
  );
  const poolId = poolRows[0]?.id;
  assert.ok(poolId, 'active pool required');

  const orphanUsername = `bot_pool${poolId}_slot6`;
  const existing = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [orphanUsername]);
  let orphanId = existing[0]?.id;
  if (!orphanId) {
    const insert = await query('INSERT INTO users (username, is_bot) VALUES (?, TRUE)', [orphanUsername]);
    orphanId = insert.insertId;
  }

  const slotIndex = await findAvailableBotSlotIndex(poolId);
  assert.notEqual(slotIndex, 6, 'skips occupied username slot');
  assert.ok(slotIndex > 6 || slotIndex < 6, 'returns a free slot');

  await query('DELETE FROM users WHERE id = ?', [orphanId]);
}

async function main() {
  console.log('▶ testAccountDeletionGuest…');

  await testFindAvailableSlotSkipsExistingUsernames();
  console.log('  ✓ slot bot disponible même si username orphelin existe');

  await testGuestDeletionReplacesWithBot();
  console.log('  ✓ suppression invité remplace par un bot sans doublon');

  console.log('testAccountDeletionGuest: OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
