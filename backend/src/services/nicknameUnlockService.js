/**
 * Déblocages de titres (surnoms) hors progression de rang — welcome / guide / Battle Pass / familles.
 */
import { query } from '../config/database.js';
import {
  ACHIEVEMENT_FAMILY_NICKNAMES,
  ONBOARDING_NICKNAME,
  WELCOME_NICKNAME,
  buildSeasonFreeNicknameEntry,
  buildSeasonNicknameEntry,
  isKnownNicknameId,
  seasonNicknameId,
} from './characterAppearance.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?
       LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * @param {number} userId
 * @param {import('mysql2/promise').PoolConnection|null} [connection]
 * @returns {Promise<string[]>}
 */
export async function listGrantedNicknameIds(userId, connection = null) {
  if (!(await tableExists('player_nickname_unlocks'))) return [];
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;
  const rows = await run(
    'SELECT nickname_id FROM player_nickname_unlocks WHERE user_id = ? ORDER BY unlocked_at ASC, id ASC',
    [userId],
  );
  return rows.map(row => row.nickname_id).filter(Boolean);
}

/**
 * Catalogue d’entrées dérivées des unlocks (pour l’UI).
 * @param {string[]} grantedIds
 */
export function catalogEntriesForGrantedIds(grantedIds = []) {
  const entries = [];
  for (const id of grantedIds) {
    if (id === WELCOME_NICKNAME.id) {
      entries.push(WELCOME_NICKNAME);
      continue;
    }
    if (id === ONBOARDING_NICKNAME.id) {
      entries.push(ONBOARDING_NICKNAME);
      continue;
    }
    const freeMatch = /^season_(\d+)_free$/.exec(String(id));
    if (freeMatch) {
      entries.push(buildSeasonFreeNicknameEntry(Number(freeMatch[1])));
      continue;
    }
    const match = /^season_(\d+)$/.exec(String(id));
    if (match) {
      entries.push(buildSeasonNicknameEntry(Number(match[1])));
      continue;
    }
    const family = ACHIEVEMENT_FAMILY_NICKNAMES.find(entry => entry.id === id);
    if (family) entries.push(family);
  }
  return entries;
}

/**
 * @param {number} userId
 * @param {string} nicknameId
 * @param {{ source?: string, sourceRef?: string|null, connection?: object|null }} [opts]
 */
export async function grantNicknameUnlock(
  userId,
  nicknameId,
  { source = 'unknown', sourceRef = null, connection = null } = {},
) {
  if (!userId) throw httpError(400, 'userId requis.');
  if (!isKnownNicknameId(nicknameId)) throw httpError(400, 'Titre inconnu.');

  if (!(await tableExists('player_nickname_unlocks'))) {
    throw httpError(503, 'Table player_nickname_unlocks absente — migrer la base.');
  }

  const executor = connection || {
    execute: async (sql, params) => [await query(sql, params)],
  };

  try {
    await executor.execute(
      `INSERT INTO player_nickname_unlocks (user_id, nickname_id, source, source_ref)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        nicknameId,
        String(source).slice(0, 32),
        sourceRef != null ? String(sourceRef).slice(0, 64) : null,
      ],
    );
    return { nicknameId, granted: true, source };
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return { nicknameId, granted: false, alreadyOwned: true, source };
    }
    throw err;
  }
}

export { seasonNicknameId, WELCOME_NICKNAME, ONBOARDING_NICKNAME };
