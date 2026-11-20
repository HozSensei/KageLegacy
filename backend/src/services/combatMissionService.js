/**
 * Missions stub pour le combat deck-building (Phase 4+).
 * Ne remplace pas le missionService legacy (escouade / idle).
 *
 * startMission lance désormais un **parcours** (mission run), pas un combat one-shot.
 */
import { query } from '../config/database.js';
import { listEnemyTemplates } from './deckCombat/enemyTemplates.js';
import { annotateMissionAccess } from './missionRankAccess.js';
import { ASPIRANT_RANK } from './characterAppearance.js';
import { attachMissionLore } from '../../scripts/data/missionLore.js';

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
  const encounters = parseJson(row.encounters_json, []);
  return attachMissionLore({
    id: row.id,
    slug: row.slug,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    rank: row.rank,
    encounters,
    encounterCount: encounters.length,
    rewards: parseJson(row.rewards_json, {}),
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
  });
}

export async function listMissions(characterRank = ASPIRANT_RANK) {
  const rows = await query(
    `SELECT * FROM mission_definitions
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map(row => annotateMissionAccess(serializeMission(row), characterRank));
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
 * Lance un parcours de mission (multi-combats + événements).
 */
export async function startMission(userId, missionId, deckId = null) {
  const { startRun } = await import('./missionRunService.js');
  return startRun(userId, missionId, deckId);
}

export function getEnemyCatalog() {
  return listEnemyTemplates();
}
