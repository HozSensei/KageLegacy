/**
 * Tests suppression de compte × clans joueurs.
 * Usage: node backend/scripts/testAccountDeletionClans.js
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import {
  createPlayerClan,
  joinPlayerClan,
  getClanMembership,
  getClanPayload,
  handleClanOnAccountDeletion,
  listClanMembers,
} from '../src/services/playerClanService.js';

const PREFIX = `test_del_clan_${Date.now()}`;

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

async function deleteTestUser(userId) {
  await query('DELETE FROM player_clan_members WHERE user_id = ?', [userId]);
  await query('DELETE FROM player_clans WHERE leader_user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function testSoloLeaderDissolvesClan() {
  const leaderId = await createTestSensei(`${PREFIX}_solo`);
  await createPlayerClan(leaderId, `Solo ${Date.now()}`);
  const membership = await getClanMembership(leaderId);
  assert.ok(membership, 'leader in clan');

  const result = await handleClanOnAccountDeletion(leaderId);
  assert.equal(result.action, 'clan_dissolved');

  const clanRows = await query('SELECT id FROM player_clans WHERE id = ?', [membership.clanId]);
  assert.equal(clanRows.length, 0, 'clan row removed');

  const memberRows = await query('SELECT 1 FROM player_clan_members WHERE clan_id = ?', [
    membership.clanId,
  ]);
  assert.equal(memberRows.length, 0, 'no orphan members');

  await deleteTestUser(leaderId);
}

async function testMemberLeavePreservesClan() {
  const leaderId = await createTestSensei(`${PREFIX}_lead_a`);
  const memberId = await createTestSensei(`${PREFIX}_mem_a`);
  const created = await createPlayerClan(leaderId, `Duo ${Date.now()}`);
  await joinPlayerClan(memberId, created.clan.inviteCode);

  const result = await handleClanOnAccountDeletion(memberId);
  assert.equal(result.action, 'member_left');
  assert.equal(result.remainingCount, 1);

  const clan = await getClanPayload(leaderId);
  assert.ok(clan.member, 'clan still exists for leader');
  assert.equal(clan.clan.memberCount, 1);
  assert.equal(clan.clan.leaderUserId, leaderId);

  await deleteTestUser(memberId);
  await query('DELETE FROM player_clans WHERE id = ?', [created.clan.id]);
  await deleteTestUser(leaderId);
}

async function testLeaderTransferOnAccountDeletion() {
  const leaderId = await createTestSensei(`${PREFIX}_lead_b`);
  const allyA = await createTestSensei(`${PREFIX}_ally_a`);
  const allyB = await createTestSensei(`${PREFIX}_ally_b`);

  const created = await createPlayerClan(leaderId, `Squad ${Date.now()}`);
  await joinPlayerClan(allyA, created.clan.inviteCode);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await joinPlayerClan(allyB, created.clan.inviteCode);

  const before = await listClanMembers(created.clan.id);
  const expectedSuccessor = before.find((member) => member.userId !== leaderId);

  const result = await handleClanOnAccountDeletion(leaderId);
  assert.equal(result.action, 'leadership_transferred');
  assert.equal(result.newLeaderUserId, expectedSuccessor.userId);
  assert.equal(result.remainingCount, 2);

  const clanRows = await query('SELECT leader_user_id FROM player_clans WHERE id = ?', [
    created.clan.id,
  ]);
  assert.equal(Number(clanRows[0].leader_user_id), expectedSuccessor.userId, 'new leader set');

  const members = await listClanMembers(created.clan.id);
  assert.equal(members.length, 2, 'clan keeps remaining members');
  assert.ok(!members.some((member) => member.userId === leaderId), 'departing leader removed');

  const wellRows = await query('SELECT well_drops FROM player_clans WHERE id = ?', [created.clan.id]);
  assert.ok(wellRows.length === 1, 'clan not dissolved');

  await deleteTestUser(leaderId);
  await query('DELETE FROM player_clans WHERE id = ?', [created.clan.id]);
  await deleteTestUser(allyA);
  await deleteTestUser(allyB);
}

async function main() {
  console.log('▶ testAccountDeletionClans…');

  await testSoloLeaderDissolvesClan();
  console.log('  ✓ chef solo → clan dissous');

  await testMemberLeavePreservesClan();
  console.log('  ✓ membre → clan conservé');

  await testLeaderTransferOnAccountDeletion();
  console.log('  ✓ chef multi-membres → leadership transféré');

  console.log('testAccountDeletionClans: OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
