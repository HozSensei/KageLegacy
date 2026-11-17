import { query } from '../config/database.js';
import { generateInviteCode } from './academyRecruit.js';
import { buildSenseiIdentities } from './senseiIdentityService.js';
import { getUserLanguage } from './narrative/viewerLocale.js';

export const MAX_CLAN_MEMBERS = 12;
export const WELL_CAPACITY_DEFAULT = 50;

export async function getClanMembership(userId) {
  const rows = await query(
    `SELECT pcm.clan_id, pcm.joined_at, pc.name, pc.invite_code, pc.leader_user_id,
            pc.well_drops, pc.well_capacity, pc.created_at
     FROM player_clan_members pcm
     JOIN player_clans pc ON pc.id = pcm.clan_id
     WHERE pcm.user_id = ?
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    clanId: row.clan_id,
    name: row.name,
    inviteCode: row.invite_code,
    leaderUserId: row.leader_user_id,
    isLeader: row.leader_user_id === userId,
    wellDrops: row.well_drops,
    wellCapacity: row.well_capacity,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
  };
}

export async function listClanMembers(clanId) {
  const rows = await query(
    `SELECT pcm.user_id, pcm.joined_at, s.name AS sensei_name
     FROM player_clan_members pcm
     JOIN sensei s ON s.user_id = pcm.user_id
     WHERE pcm.clan_id = ?
     ORDER BY pcm.joined_at ASC`,
    [clanId],
  );
  return rows.map((row) => ({
    userId: row.user_id,
    senseiName: row.sensei_name,
    joinedAt: row.joined_at,
  }));
}

export async function createPlayerClan(userId, name) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < 3 || trimmed.length > 64) {
    const error = new Error('Le nom du clan doit contenir entre 3 et 64 caractères.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await getClanMembership(userId);
  if (existing) {
    const error = new Error('Vous appartenez déjà à un clan.');
    error.statusCode = 409;
    throw error;
  }

  let inviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const dup = await query('SELECT id FROM player_clans WHERE invite_code = ? LIMIT 1', [inviteCode]);
    if (!dup.length) break;
    inviteCode = generateInviteCode();
  }

  const clanResult = await query(
    `INSERT INTO player_clans (name, invite_code, leader_user_id, well_capacity)
     VALUES (?, ?, ?, ?)`,
    [trimmed, inviteCode, userId, WELL_CAPACITY_DEFAULT],
  );
  const clanId = clanResult.insertId;
  await query('INSERT INTO player_clan_members (clan_id, user_id) VALUES (?, ?)', [clanId, userId]);

  return getClanPayload(userId);
}

export async function joinPlayerClan(userId, inviteCode) {
  const code = String(inviteCode || '').trim().toUpperCase();
  if (!code) {
    const error = new Error('Code d\'invitation requis.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await getClanMembership(userId);
  if (existing) {
    const error = new Error('Vous appartenez déjà à un clan.');
    error.statusCode = 409;
    throw error;
  }

  const clanRows = await query('SELECT * FROM player_clans WHERE invite_code = ? LIMIT 1', [code]);
  const clan = clanRows[0];
  if (!clan) {
    const error = new Error('Code d\'invitation invalide.');
    error.statusCode = 404;
    throw error;
  }

  const countRows = await query(
    'SELECT COUNT(*) AS cnt FROM player_clan_members WHERE clan_id = ?',
    [clan.id],
  );
  if (Number(countRows[0]?.cnt ?? 0) >= MAX_CLAN_MEMBERS) {
    const error = new Error(`Ce clan est complet (${MAX_CLAN_MEMBERS} Senseis max).`);
    error.statusCode = 409;
    throw error;
  }

  await query('INSERT INTO player_clan_members (clan_id, user_id) VALUES (?, ?)', [clan.id, userId]);
  return getClanPayload(userId);
}

export async function leavePlayerClan(userId) {
  const membership = await getClanMembership(userId);
  if (!membership) {
    const error = new Error('Vous n\'appartenez à aucun clan.');
    error.statusCode = 404;
    throw error;
  }

  const members = await listClanMembers(membership.clanId);

  if (membership.isLeader && members.length > 1) {
    const error = new Error('Le chef doit transférer le leadership ou dissoudre le clan avant de partir.');
    error.statusCode = 409;
    throw error;
  }

  await query('DELETE FROM player_clan_members WHERE clan_id = ? AND user_id = ?', [
    membership.clanId,
    userId,
  ]);

  if (membership.isLeader) {
    await query('DELETE FROM player_clans WHERE id = ?', [membership.clanId]);
  }

  return { left: true };
}

export async function getClanPayload(userId) {
  const membership = await getClanMembership(userId);
  if (!membership) {
    return { member: false, clan: null, members: [], well: null };
  }

  const members = await listClanMembers(membership.clanId);
  const locale = await getUserLanguage(userId);
  const identityMap = await buildSenseiIdentities(
    members.map((member) => member.userId),
    locale,
  );

  return {
    member: true,
    clan: {
      id: membership.clanId,
      name: membership.name,
      inviteCode: membership.inviteCode,
      isLeader: membership.isLeader,
      leaderUserId: membership.leaderUserId,
      memberCount: members.length,
      maxMembers: MAX_CLAN_MEMBERS,
    },
    members: members.map((member) => ({
      ...member,
      identity: identityMap.get(member.userId) ?? null,
    })),
    well: {
      drops: membership.wellDrops,
      capacity: membership.wellCapacity,
      pct: Math.min(100, Math.round((membership.wellDrops / membership.wellCapacity) * 100)),
    },
  };
}

export async function listClanMemberUserIds(clanId) {
  const rows = await query('SELECT user_id FROM player_clan_members WHERE clan_id = ?', [clanId]);
  return rows.map((r) => r.user_id);
}

/**
 * Prépare le clan avant suppression de compte : retrait membre, dissolution solo,
 * ou transfert automatique du leadership si le chef a des alliés.
 */
export async function handleClanOnAccountDeletion(userId) {
  const membership = await getClanMembership(userId);
  if (!membership) {
    return { action: 'none' };
  }

  const members = await listClanMembers(membership.clanId);
  const otherMembers = members.filter((member) => member.userId !== userId);

  if (!membership.isLeader) {
    await query('DELETE FROM player_clan_members WHERE clan_id = ? AND user_id = ?', [
      membership.clanId,
      userId,
    ]);
    return { action: 'member_left', clanId: membership.clanId, remainingCount: otherMembers.length };
  }

  if (otherMembers.length === 0) {
    await query('DELETE FROM player_clan_members WHERE clan_id = ? AND user_id = ?', [
      membership.clanId,
      userId,
    ]);
    await query('DELETE FROM player_clans WHERE id = ?', [membership.clanId]);
    return { action: 'clan_dissolved', clanId: membership.clanId };
  }

  const successor = otherMembers[0];
  await query('UPDATE player_clans SET leader_user_id = ? WHERE id = ?', [
    successor.userId,
    membership.clanId,
  ]);
  await query('DELETE FROM player_clan_members WHERE clan_id = ? AND user_id = ?', [
    membership.clanId,
    userId,
  ]);

  return {
    action: 'leadership_transferred',
    clanId: membership.clanId,
    newLeaderUserId: successor.userId,
    remainingCount: otherMembers.length,
  };
}
