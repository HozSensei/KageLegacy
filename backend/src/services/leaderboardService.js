/**
 * Classements serveur — stats uniquement lues en base (anti-triche basique).
 * Board : level (niveau + XP).
 */
import { query } from '../config/database.js';
import { getFaction, isValidFactionId, listFactions } from './factionCatalog.js';

export const LEADERBOARD_BOARDS = ['level'];

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function clampPagination({ page, limit }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  return { page: p, limit: l, offset: (p - 1) * l };
}

async function columnExists(tableName, columnName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = ?
         AND column_name = ?
       LIMIT 1`,
      [tableName, columnName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

function serializeEntry(row, rank) {
  const factionId = row.faction_id || null;
  return {
    rank,
    userId: row.user_id,
    playerName: row.player_name || null,
    characterName: row.character_name,
    level: Number(row.level) || 1,
    xp: Number(row.xp) || 0,
    rankTitle: row.player_rank || null,
    factionId,
    faction: factionId ? getFaction(factionId) : null,
    score: Number(row.level) || 1,
  };
}

/**
 * Classement niveau / XP — source : personnage stocké dans player_profiles.
 */
async function fetchLevelBoard({ limit, offset, factionId }) {
  const hasFaction = await columnExists('player_profiles', 'character_faction_id');
  const factionSelect = hasFaction ? 'pc.character_faction_id AS faction_id' : 'NULL AS faction_id';
  const factionFilter =
    hasFaction && isValidFactionId(factionId) ? 'AND pc.character_faction_id = ?' : '';
  const params = [];
  if (hasFaction && isValidFactionId(factionId)) params.push(factionId);

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM player_profiles pc
     WHERE pc.character_name IS NOT NULL ${factionFilter}`,
    params,
  );
  const total = Number(countRows[0]?.total) || 0;

  const rows = await query(
    `SELECT pc.user_id,
            pc.character_name,
            pc.character_level AS level,
            pc.character_xp AS xp,
            pc.character_rank AS player_rank,
            ${factionSelect},
            pc.display_name AS player_name
     FROM player_profiles pc
     WHERE pc.character_name IS NOT NULL ${factionFilter}
     ORDER BY pc.character_level DESC, pc.character_xp DESC, pc.id ASC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );

  return { total, rows };
}

export async function getLeaderboard({
  board = 'level',
  page = 1,
  limit = DEFAULT_LIMIT,
  factionId = null,
  viewerUserId = null,
} = {}) {
  if (!LEADERBOARD_BOARDS.includes(board)) {
    throw httpError(400, `Board invalide. Utilisez : ${LEADERBOARD_BOARDS.join(', ')}`);
  }

  const pagination = clampPagination({ page, limit });
  const { total, rows } = await fetchLevelBoard({
    limit: pagination.limit,
    offset: pagination.offset,
    factionId,
  });

  const entries = rows.map((row, index) =>
    serializeEntry(row, pagination.offset + index + 1),
  );

  let me = null;
  if (viewerUserId) {
    me = await getViewerRank({ userId: viewerUserId, factionId });
  }

  return {
    board,
    factionId: isValidFactionId(factionId) ? factionId : null,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    entries,
    me,
  };
}

async function getViewerRank({ userId, factionId }) {
  const hasFaction = await columnExists('player_profiles', 'character_faction_id');
  const rows = await query(
    `SELECT pc.user_id, pc.character_name, pc.character_level AS level,
            pc.character_xp AS xp, pc.character_rank AS player_rank,
            ${hasFaction ? 'pc.character_faction_id AS faction_id' : 'NULL AS faction_id'},
            pc.display_name AS player_name
     FROM player_profiles pc
     WHERE pc.user_id = ? AND pc.character_name IS NOT NULL
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;

  if (isValidFactionId(factionId) && hasFaction && rows[0].faction_id !== factionId) {
    return null;
  }

  const ahead = await query(
    `SELECT COUNT(*) AS n
     FROM player_profiles pc
     WHERE pc.character_name IS NOT NULL
       AND (
            (pc.character_level > ?)
         OR (pc.character_level = ? AND pc.character_xp > ?)
         OR (pc.character_level = ? AND pc.character_xp = ? AND pc.id < (
               SELECT id FROM player_profiles
               WHERE user_id = ? AND character_name IS NOT NULL LIMIT 1
             ))
       )
       ${isValidFactionId(factionId) && hasFaction ? 'AND pc.character_faction_id = ?' : ''}`,
    isValidFactionId(factionId) && hasFaction
      ? [rows[0].level, rows[0].level, rows[0].xp, rows[0].level, rows[0].xp, userId, factionId]
      : [rows[0].level, rows[0].level, rows[0].xp, rows[0].level, rows[0].xp, userId],
  );

  return serializeEntry(rows[0], Number(ahead[0]?.n) + 1);
}

/**
 * Score agrégé par faction : somme des niveaux des membres.
 */
export async function getFactionStandings({ board = 'level' } = {}) {
  if (!LEADERBOARD_BOARDS.includes(board)) {
    throw httpError(400, `Board invalide. Utilisez : ${LEADERBOARD_BOARDS.join(', ')}`);
  }

  const hasFaction = await columnExists('player_profiles', 'character_faction_id');
  if (!hasFaction) {
    return {
      board,
      standings: listFactions().map(f => ({
        factionId: f.id,
        faction: f,
        memberCount: 0,
        score: 0,
      })),
    };
  }

  const rows = await query(
    `SELECT character_faction_id AS faction_id,
            COUNT(*) AS member_count,
            COALESCE(SUM(character_level), 0) AS score
     FROM player_profiles
     WHERE character_name IS NOT NULL AND character_faction_id IS NOT NULL
     GROUP BY character_faction_id`,
  );
  const byId = new Map(rows.map(r => [r.faction_id, r]));
  const standings = listFactions()
    .map(f => {
      const row = byId.get(f.id);
      return {
        factionId: f.id,
        faction: f,
        memberCount: Number(row?.member_count) || 0,
        score: Number(row?.score) || 0,
      };
    })
    .sort((a, b) => b.score - a.score || b.memberCount - a.memberCount);

  return { board, standings };
}
