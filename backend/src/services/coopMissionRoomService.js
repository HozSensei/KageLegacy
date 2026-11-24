/**
 * Lobby missions coopératives — salles persistées (code, setup, stakes, ready, start).
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import { COOP_ROOM_WAIT_MS } from '../config/coopMissionConfig.js';
import { isValidPurseStake } from '../config/missionRunEconomy.js';
import { getMission } from './combatMissionService.js';
import {
  canPlayMissionRank,
  requiredCharacterRankForMission,
} from './missionRankAccess.js';
import { getCharacter } from './playerCharacterService.js';

function httpError(statusCode, message, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

async function pruneExpiredRooms() {
  await query(
    `UPDATE coop_mission_rooms
     SET status = 'closed', revision = revision + 1
     WHERE status IN ('waiting', 'ready') AND expires_at < UTC_TIMESTAMP(6)`,
  );
}

function isMember(row, userId) {
  return Number(row.host_id) === Number(userId) || Number(row.guest_id) === Number(userId);
}

function roleOf(row, userId) {
  if (Number(row.host_id) === Number(userId)) return 'host';
  if (Number(row.guest_id) === Number(userId)) return 'guest';
  return null;
}

export function serializeRoom(row, userId, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    revision: Number(row.revision) || 0,
    role: roleOf(row, userId),
    hostId: row.host_id,
    guestId: row.guest_id,
    missionId: row.mission_id,
    hardMode: Boolean(row.hard_mode),
    hostStake: Number(row.host_stake) || 0,
    guestStake: Number(row.guest_stake) || 0,
    guestReady: Boolean(row.guest_ready),
    expiresAt: toIso(row.expires_at),
    runId: extras.runId ?? row.run_id ?? null,
    host: extras.host ?? null,
    guest: extras.guest ?? null,
    ...extras,
  };
}

async function withRoomPlayers(row, userId, extras = {}) {
  try {
    const { getPublicPlayersMap } = await import('./publicPlayerService.js');
    const map = await getPublicPlayersMap([row.host_id, row.guest_id].filter(Boolean));
    return serializeRoom(row, userId, {
      ...extras,
      host: map.get(row.host_id) || null,
      guest: row.guest_id ? map.get(row.guest_id) || null : null,
    });
  } catch {
    return serializeRoom(row, userId, extras);
  }
}

async function loadRoomRow(roomId) {
  const rows = await query('SELECT * FROM coop_mission_rooms WHERE id = ? LIMIT 1', [roomId]);
  return rows[0] || null;
}

async function loadRoomByCode(code) {
  const rows = await query('SELECT * FROM coop_mission_rooms WHERE code = ? LIMIT 1', [code]);
  return rows[0] || null;
}

export async function findOpenRoomForUser(userId) {
  await pruneExpiredRooms();
  const rows = await query(
    `SELECT * FROM coop_mission_rooms
     WHERE status IN ('waiting', 'ready')
       AND (host_id = ? OR guest_id = ?)
     ORDER BY created_at DESC LIMIT 1`,
    [userId, userId],
  );
  return rows[0] || null;
}

async function findActiveCoopRunForUser(userId) {
  const rows = await query(
    `SELECT id FROM coop_mission_runs
     WHERE state = 'in_progress' AND (host_id = ? OR guest_id = ?)
     LIMIT 1`,
    [userId, userId],
  );
  return rows[0] || null;
}

async function assertNoBlockingActivity(userId) {
  const coopRun = await findActiveCoopRunForUser(userId);
  if (coopRun) {
    throw httpError(409, `Mission d’équipe déjà en cours (${coopRun.id}).`, 'COOP_RUN_ACTIVE');
  }
  const solo = await query(
    "SELECT id FROM mission_runs WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
    [userId],
  );
  if (solo[0]) {
    throw httpError(409, `Parcours solo déjà en cours (${solo[0].id}).`, 'SOLO_RUN_ACTIVE');
  }
  const combat = await query(
    "SELECT id FROM combat_sessions WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
    [userId],
  );
  if (combat[0]) {
    throw httpError(409, `Combat déjà en cours (${combat[0].id}).`, 'COMBAT_ACTIVE');
  }
}

function generateCode() {
  return randomBytes(5).toString('hex').toUpperCase();
}

export async function createRoom(userId) {
  await pruneExpiredRooms();
  const existing = await findOpenRoomForUser(userId);
  if (existing) return withRoomPlayers(existing, userId);

  const activeRun = await findActiveCoopRunForUser(userId);
  if (activeRun) {
    return {
      id: null,
      status: 'run_active',
      runId: activeRun.id,
      revision: 0,
      role: null,
    };
  }

  await assertNoBlockingActivity(userId);

  let code;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    code = generateCode();
    const clash = await loadRoomByCode(code);
    if (!clash) break;
    code = null;
  }
  if (!code) throw httpError(503, 'Impossible de générer un code de salle.');

  const id = randomUUID();
  await query(
    `INSERT INTO coop_mission_rooms
      (id, code, host_id, guest_id, status, mission_id, hard_mode, host_stake, guest_stake,
       guest_ready, revision, expires_at)
     VALUES (?, ?, ?, NULL, 'waiting', NULL, 0, 0, 0, 0, 0,
             DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? MICROSECOND))`,
    [id, code, userId, COOP_ROOM_WAIT_MS * 1000],
  );
  const row = await loadRoomRow(id);
  return withRoomPlayers(row, userId);
}

export async function joinRoom(userId, rawCode) {
  await pruneExpiredRooms();
  const code = String(rawCode || '')
    .trim()
    .toUpperCase();
  const row = await loadRoomByCode(code);
  if (!row || !['waiting', 'ready'].includes(row.status)) {
    throw httpError(404, 'Salle introuvable ou expirée.');
  }
  if (isMember(row, userId)) return withRoomPlayers(row, userId);
  if (row.guest_id) throw httpError(409, 'Cette salle est déjà complète.');

  await assertNoBlockingActivity(userId);
  if (Number(row.host_id) === Number(userId)) {
    throw httpError(400, 'Vous êtes déjà l’hôte de cette salle.');
  }

  const result = await query(
    `UPDATE coop_mission_rooms
     SET guest_id = ?, status = 'waiting', guest_ready = 0, revision = revision + 1,
         expires_at = DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? MICROSECOND)
     WHERE id = ? AND guest_id IS NULL AND status IN ('waiting', 'ready')`,
    [userId, COOP_ROOM_WAIT_MS * 1000, row.id],
  );
  if (!result.affectedRows) throw httpError(409, 'Impossible de rejoindre cette salle.');

  return withRoomPlayers(await loadRoomRow(row.id), userId);
}

export async function getRoom(userId, roomId) {
  await pruneExpiredRooms();
  const row = await loadRoomRow(roomId);
  if (!row || !isMember(row, userId)) throw httpError(404, 'Salle introuvable.');

  let runId = null;
  if (row.status === 'starting' || row.status === 'closed') {
    const runs = await query(
      `SELECT id FROM coop_mission_runs
       WHERE room_id = ? ORDER BY created_at DESC LIMIT 1`,
      [row.id],
    );
    runId = runs[0]?.id || null;
  }
  return withRoomPlayers(row, userId, { runId });
}

export async function setupRoom(userId, roomId, { missionId, hardMode = false } = {}) {
  const row = await loadRoomRow(roomId);
  if (!row || !isMember(row, userId)) throw httpError(404, 'Salle introuvable.');
  if (Number(row.host_id) !== Number(userId)) {
    throw httpError(403, 'Seul le chef peut choisir la mission.');
  }
  if (!['waiting', 'ready'].includes(row.status)) {
    throw httpError(409, 'La salle n’accepte plus de réglages.');
  }

  const mission = await getMission(missionId);
  const character = await getCharacter(userId);
  if (!character) throw httpError(400, 'Créez un personnage avant de lancer une mission.');
  if (!canPlayMissionRank(character.rank, mission.rank)) {
    const required = requiredCharacterRankForMission(mission.rank);
    throw httpError(403, `Rang ${required} requis pour les missions ${mission.rank}.`);
  }

  await query(
    `UPDATE coop_mission_rooms
     SET mission_id = ?, hard_mode = ?, guest_ready = 0, status = 'waiting',
         revision = revision + 1
     WHERE id = ?`,
    [mission.id, hardMode ? 1 : 0, roomId],
  );
  return withRoomPlayers(await loadRoomRow(roomId), userId);
}

export async function setStake(userId, roomId, stake) {
  const row = await loadRoomRow(roomId);
  if (!row || !isMember(row, userId)) throw httpError(404, 'Salle introuvable.');
  if (!['waiting', 'ready'].includes(row.status)) {
    throw httpError(409, 'La salle n’accepte plus de bourse.');
  }
  if (!isValidPurseStake(stake)) {
    throw httpError(400, 'Bourse invalide (0 / 100 / 200 / 300).');
  }
  const amount = Number(stake) || 0;
  const role = roleOf(row, userId);
  if (role === 'host') {
    await query(
      `UPDATE coop_mission_rooms
       SET host_stake = ?, guest_ready = 0, status = 'waiting', revision = revision + 1
       WHERE id = ?`,
      [amount, roomId],
    );
  } else {
    await query(
      `UPDATE coop_mission_rooms
       SET guest_stake = ?, guest_ready = 0, status = 'waiting', revision = revision + 1
       WHERE id = ?`,
      [amount, roomId],
    );
  }
  return withRoomPlayers(await loadRoomRow(roomId), userId);
}

export async function setGuestReady(userId, roomId, ready = true) {
  const row = await loadRoomRow(roomId);
  if (!row || !isMember(row, userId)) throw httpError(404, 'Salle introuvable.');
  if (Number(row.guest_id) !== Number(userId)) {
    throw httpError(403, 'Seul l’invité peut se déclarer prêt.');
  }
  if (!['waiting', 'ready'].includes(row.status)) {
    throw httpError(409, 'La salle n’accepte plus de ready.');
  }
  if (!row.mission_id) throw httpError(400, 'Le chef doit d’abord choisir une mission.');

  const nextReady = ready ? 1 : 0;
  await query(
    `UPDATE coop_mission_rooms
     SET guest_ready = ?, status = ?, revision = revision + 1
     WHERE id = ?`,
    [nextReady, nextReady ? 'ready' : 'waiting', roomId],
  );
  return withRoomPlayers(await loadRoomRow(roomId), userId);
}

export async function closeRoom(userId, roomId) {
  const row = await loadRoomRow(roomId);
  if (!row || !isMember(row, userId)) throw httpError(404, 'Salle introuvable.');
  if (!['waiting', 'ready'].includes(row.status)) {
    throw httpError(409, 'Impossible de fermer cette salle.');
  }
  await query(
    `UPDATE coop_mission_rooms
     SET status = 'closed', revision = revision + 1
     WHERE id = ?`,
    [roomId],
  );
  return withRoomPlayers(await loadRoomRow(roomId), userId);
}

export async function markRoomStarting(roomId) {
  await query(
    `UPDATE coop_mission_rooms
     SET status = 'starting', revision = revision + 1
     WHERE id = ? AND status = 'ready'`,
    [roomId],
  );
}

export async function markRoomClosed(roomId) {
  await query(
    `UPDATE coop_mission_rooms
     SET status = 'closed', revision = revision + 1
     WHERE id = ?`,
    [roomId],
  );
}

export async function requireStartableRoom(userId, roomId) {
  const row = await loadRoomRow(roomId);
  if (!row || !isMember(row, userId)) throw httpError(404, 'Salle introuvable.');
  if (Number(row.host_id) !== Number(userId)) {
    throw httpError(403, 'Seul le chef peut lancer la mission.');
  }
  if (row.status !== 'ready' || !row.guest_ready || !row.guest_id || !row.mission_id) {
    throw httpError(409, 'L’invité doit être prêt et la mission choisie.');
  }
  return row;
}

export const __test = { parseJson, serializeRoom, isMember, roleOf };
