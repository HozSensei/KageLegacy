/**
 * Tests purge automatique des comptes invités expirés.
 * Usage: node backend/scripts/testGuestCleanup.js
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import { registerGuestUser, createSession } from '../src/services/authService.js';
import {
  purgeExpiredGuestAccounts,
  findExpiredGuestUsers,
} from '../src/services/guestCleanupService.js';

const PREFIX = `test_guest_purge_${Date.now()}`;

async function createExpiredGuest() {
  const { user } = await registerGuestUser({ characterName: `${PREFIX}_sensei` });
  await query(
    'UPDATE users SET guest_expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE id = ?',
    [user.id]
  );
  const { token } = await createSession(user.id);
  return { user, token };
}

async function testPurgeRemovesExpiredGuest() {
  const { user } = await createExpiredGuest();

  const expiredBefore = await findExpiredGuestUsers(100);
  assert.ok(
    expiredBefore.some(row => row.id === user.id),
    'expired guest is eligible for purge'
  );

  const result = await purgeExpiredGuestAccounts();
  assert.ok(result.purgedGuests >= 1, 'at least one guest purged');

  const userRows = await query('SELECT id FROM users WHERE id = ?', [user.id]);
  assert.equal(userRows.length, 0, 'expired guest user deleted');

  const sessionRows = await query('SELECT id FROM user_sessions WHERE user_id = ?', [user.id]);
  assert.equal(sessionRows.length, 0, 'guest sessions deleted');
}

async function testActiveGuestIsNotPurged() {
  const { user } = await registerGuestUser({ characterName: `${PREFIX}_active` });

  const result = await purgeExpiredGuestAccounts();
  const stillThere = await query('SELECT id FROM users WHERE id = ?', [user.id]);
  assert.equal(stillThere.length, 1, 'active guest kept');

  const expiredList = await findExpiredGuestUsers(500);
  assert.ok(!expiredList.some(row => row.id === user.id), 'active guest not in purge list');

  await query('DELETE FROM player_profiles WHERE user_id = ?', [user.id]);
  await query('DELETE FROM user_sessions WHERE user_id = ?', [user.id]);
  await query('DELETE FROM users WHERE id = ?', [user.id]);

  void result;
}

async function main() {
  console.log('▶ testGuestCleanup…');

  await testPurgeRemovesExpiredGuest();
  console.log('  ✓ invité expiré supprimé avec ses sessions');

  await testActiveGuestIsNotPurged();
  console.log('  ✓ invité actif conservé');

  console.log('testGuestCleanup: OK');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
