import { randomBytes, randomUUID } from 'node:crypto';
import { getPlayableDeckForCombat } from './deckService.js';
import { loadCombatCharacter } from './combatCharacterService.js';

import { computeTalentBonuses } from './talentTreeService.js';
import { applyCoopAction, createCoopCombat, publicCoopCombat } from './deckCombat/coopCombat.js';

const WAIT_MS = 30 * 60_000;
const ACTIVE_MS = 2 * 60 * 60_000;
const MAX_ROOMS = 500;

function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}

async function loadFighter(userId) {
  const [deck, character, talents] = await Promise.all([
    getPlayableDeckForCombat(userId),
    loadCombatCharacter(userId),
    computeTalentBonuses(userId),
  ]);
  if (!character) fail(400, 'Un personnage est nécessaire pour jouer en duo.');
  return {
    id: userId,
    name: character.name,
    rank: character.rank,
    level: character.level,
    profile: character.profile,
    deckEntries: deck.cards,
    stats: talents.stats,
    talentCodes: (talents.effects || []).map(effect => effect.effectCode).filter(Boolean),
  };
}

export function createCoopRooms({ load = loadFighter, now = Date.now } = {}) {
  const rooms = new Map();
  const codes = new Map();

  function prune() {
    for (const room of rooms.values()) {
      if (now() >= room.expiresAt) {
        rooms.delete(room.id);
        codes.delete(room.code);
      }
    }
  }

  function member(room, id) {
    return room?.hostId === id || room?.guestId === id;
  }

  function currentRoom(id) {
    return [...rooms.values()].find(room => room.status !== 'finished' && member(room, id));
  }

  function snapshot(room, userId) {
    return {
      id: room.id,
      code: room.code,
      status: room.status,
      revision: room.revision,
      combat: room.combat ? publicCoopCombat(room.combat, userId) : null,
    };
  }

  function findMine(id, userId) {
    prune();
    const room = rooms.get(id);
    if (!member(room, userId)) fail(404, 'Salle introuvable ou expirée.');
    return room;
  }

  async function create(userId) {
    prune();
    const previous = currentRoom(userId);
    if (previous) return snapshot(previous, userId);
    if (rooms.size >= MAX_ROOMS) fail(503, 'Trop de salles ouvertes. Réessayez plus tard.');
    const host = await load(userId);
    prune();
    const concurrent = currentRoom(userId);
    if (concurrent) return snapshot(concurrent, userId);
    if (rooms.size >= MAX_ROOMS) fail(503, 'Trop de salles ouvertes. Réessayez plus tard.');
    let code;
    do {
      code = randomBytes(5).toString('hex').toUpperCase();
    } while (codes.has(code));
    const room = {
      id: randomUUID(),
      code,
      hostId: userId,
      host,
      guestId: null,
      status: 'waiting',
      revision: 0,
      combat: null,
      expiresAt: now() + WAIT_MS,
    };
    rooms.set(room.id, room);
    codes.set(room.code, room.id);
    return snapshot(room, userId);
  }

  async function join(userId, code) {
    prune();
    const room = rooms.get(codes.get(code));
    if (!room) fail(404, 'Salle introuvable ou expirée.');
    if (member(room, userId)) return snapshot(room, userId);
    if (room.status !== 'waiting' || currentRoom(userId)) fail(409, 'Une salle est déjà en cours.');
    const guest = await load(userId);
    prune();
    if (!rooms.has(room.id)) fail(404, 'Salle expirée.');
    if (member(room, userId)) return snapshot(room, userId);
    if (room.status !== 'waiting' || currentRoom(userId)) fail(409, 'Une salle est déjà en cours.');
    room.combat = { ...createCoopCombat([room.host, guest]), id: room.id };
    room.host = null;
    room.guestId = userId;
    room.status = 'active';
    room.revision++;
    room.expiresAt = now() + ACTIVE_MS;
    return snapshot(room, userId);
  }

  function action(id, userId, input) {
    const room = findMine(id, userId);
    if (input.revision != null && input.revision !== room.revision) {
      fail(409, 'Le combat a avancé. Vérifiez le nouvel état avant de rejouer.');
    }
    if (room.status === 'waiting' && input.type === 'forfeit') {
      room.status = 'finished';
      room.host = null;
      room.revision++;
      codes.delete(room.code);
      return snapshot(room, userId);
    }
    if (room.status !== 'active') fail(409, 'Aucun combat actif dans cette salle.');
    room.combat = applyCoopAction(room.combat, userId, input);
    room.status = room.combat.state === 'in_progress' ? 'active' : 'finished';
    room.revision++;
    room.expiresAt = now() + (room.status === 'active' ? ACTIVE_MS : WAIT_MS);
    return snapshot(room, userId);
  }

  return { create, join, get: (id, userId) => snapshot(findMine(id, userId), userId), action };
}

export const coopRooms = createCoopRooms();
