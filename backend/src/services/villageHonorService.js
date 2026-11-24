/**
 * Points d’honneur journaliers (UTC) — missions solo/coop + duels de decks.
 * Le ninja à l’honneur d’un village = meilleur score du jour (égalité : premier à l’atteindre).
 */
import { query } from '../config/database.js';
import { utcDateString } from './dailyUtc.js';
import { FACTION_IDS, isValidFactionId } from './factionCatalog.js';
import { buildPublicPlayerSnapshot } from './publicPlayerService.js';
import { listGrantedNicknameIds } from './nicknameUnlockService.js';
import { listGrantedFrameIds } from './frameUnlockService.js';
import { listGrantedCardEffectIds } from './cardEffectUnlockService.js';

const HONOR_POINT = 1;

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
 * +1 point d’honneur pour une victoire (mission ou duel).
 * @param {number} userId
 * @param {{ connection?: object|null }} [opts]
 */
export async function addHonorPoint(userId, { connection = null } = {}) {
  if (!userId) return { skipped: true, reason: 'no_user' };
  if (!(await tableExists('village_daily_honor_points'))) {
    return { skipped: true, reason: 'table_missing' };
  }

  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const profiles = await run(
    `SELECT character_faction_id AS faction_id
     FROM player_profiles
     WHERE user_id = ? AND character_name IS NOT NULL
     LIMIT 1`,
    [userId],
  );
  const factionId = profiles[0]?.faction_id || null;
  if (!isValidFactionId(factionId)) return { skipped: true, reason: 'no_faction' };

  const scoredOn = utcDateString();
  await run(
    `INSERT INTO village_daily_honor_points (user_id, scored_on, faction_id, points, first_reached_at, updated_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE
       points = points + VALUES(points),
       faction_id = VALUES(faction_id),
       updated_at = UTC_TIMESTAMP(6)`,
    [userId, scoredOn, factionId, HONOR_POINT],
  );
  return { ok: true, userId, scoredOn, factionId, delta: HONOR_POINT };
}

/**
 * Meilleurs ninjas du jour par village.
 * @returns {Promise<Record<string, { player: object, points: number }|null>>}
 */
export async function getHonorByFaction(scoredOn = utcDateString()) {
  const empty = Object.fromEntries(FACTION_IDS.map(id => [id, null]));
  if (!(await tableExists('village_daily_honor_points'))) return empty;

  const rows = await query(
    `SELECT h.user_id, h.faction_id, h.points, h.first_reached_at,
            p.character_name AS name,
            p.character_avatar_id,
            p.character_background_id,
            p.character_background_color,
            p.character_nickname_id,
            p.character_frame_id,
            p.character_card_effect_id,
            p.character_highest_level,
            p.character_level AS level,
            p.character_rank AS \`rank\`,
            p.character_faction_id AS faction_id
     FROM village_daily_honor_points h
     JOIN player_profiles p ON p.user_id = h.user_id AND p.character_name IS NOT NULL
     WHERE h.scored_on = ? AND h.points > 0
     ORDER BY h.faction_id ASC, h.points DESC, h.first_reached_at ASC, h.user_id ASC`,
    [scoredOn],
  );

  const best = { ...empty };
  for (const row of rows) {
    const factionId = row.faction_id;
    if (!isValidFactionId(factionId) || best[factionId]) continue;
    const [grantedNicknameIds, grantedFrameIds, grantedCardEffectIds] = await Promise.all([
      listGrantedNicknameIds(row.user_id),
      listGrantedFrameIds(row.user_id),
      listGrantedCardEffectIds(row.user_id),
    ]);
    best[factionId] = {
      points: Number(row.points) || 0,
      player: buildPublicPlayerSnapshot(row, {
        grantedNicknameIds,
        grantedFrameIds,
        grantedCardEffectIds,
      }),
    };
  }
  return best;
}
