/**
 * Missions stub pour le combat deck-building (Phase 4).
 * Ne remplace pas le missionService legacy (escouade / idle).
 */
import { query } from '../config/database.js';
import { startCombat } from './combatEngineService.js';
import { listEnemyTemplates } from './deckCombat/enemyTemplates.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
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

function serializeMission(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    rank: row.rank,
    encounters: parseJson(row.encounters_json, []),
    rewards: parseJson(row.rewards_json, {}),
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
  };
}

export async function listMissions() {
  const rows = await query(
    `SELECT * FROM mission_definitions
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map(serializeMission);
}

export async function getMission(missionId) {
  const rows = await query(
    'SELECT * FROM mission_definitions WHERE id = ? LIMIT 1',
    [missionId],
  );
  if (!rows[0]) throw httpError(404, 'Mission introuvable.');
  return serializeMission(rows[0]);
}

export async function getMissionBySlug(slug) {
  const rows = await query(
    'SELECT * FROM mission_definitions WHERE slug = ? LIMIT 1',
    [slug],
  );
  if (!rows[0]) throw httpError(404, 'Mission introuvable.');
  return serializeMission(rows[0]);
}

/**
 * Lance le premier encounter de la mission.
 */
export async function startMission(userId, missionId, deckId = null) {
  const mission = await getMission(missionId);
  return startCombat(userId, { missionId: mission.id, deckId });
}

export function getEnemyCatalog() {
  return listEnemyTemplates();
}
