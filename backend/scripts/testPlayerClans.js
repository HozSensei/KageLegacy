/**
 * Tests clans joueurs : création, tableau, puits.
 * Usage: node backend/scripts/testPlayerClans.js
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import { createPlayerClan, getClanPayload, joinPlayerClan } from '../src/services/playerClanService.js';
import { recommendAspirantToClan, listClanAcademyBoard } from '../src/services/clanAcademyBoardService.js';
import { addChakraDropForSealOpen } from '../src/services/clanChakraWellService.js';
import { listAcademyDraws } from '../src/services/academyService.js';

async function ensureDemoUsers() {
  const demo = await query('SELECT id FROM users WHERE username = ? LIMIT 1', ['demo_sensei']);
  if (demo[0]) return { leaderId: demo[0].id, memberId: demo[0].id };

  throw new Error('demo_sensei required');
}

async function main() {
  const { leaderId } = await ensureDemoUsers();

  await query('DELETE FROM player_clan_members WHERE user_id = ?', [leaderId]);
  await query('DELETE FROM player_clans WHERE leader_user_id = ?', [leaderId]);

  const payload = await createPlayerClan(leaderId, `Test Clan ${Date.now()}`);
  assert.ok(payload.member, 'clan created');
  assert.equal(payload.clan.memberCount, 1);

  const well = await addChakraDropForSealOpen(leaderId);
  assert.ok(well.contributed, 'well drop on seal');

  const draws = await listAcademyDraws(leaderId);
  if (draws[0]) {
    await query('UPDATE sensei SET clan_board_recommended_cycle = NULL WHERE user_id = ?', [leaderId]);
    await recommendAspirantToClan(leaderId, draws[0].id);
    const board = await listClanAcademyBoard(leaderId);
    assert.ok(board.posts.length >= 1, 'board post created');
  }

  console.log('testPlayerClans: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
