/**
 * Mur d’activité communautaire — victoires / échecs de missions (solo + coop).
 * Feed paginé (curseur) avec filtres village + succès/échec.
 */
import { query } from '../config/database.js';
import { isValidFactionId } from './factionCatalog.js';
import { buildPublicPlayerSnapshot } from './publicPlayerService.js';
import { listGrantedNicknameIds } from './nicknameUnlockService.js';
import { listGrantedFrameIds } from './frameUnlockService.js';
import { listGrantedCardEffectIds } from './cardEffectUnlockService.js';

const KINDS = new Set([
  'mission_victory',
  'mission_defeat',
  'coop_victory',
  'coop_defeat',
]);

const SUCCESS_KINDS = ['mission_victory', 'coop_victory'];
const FAILURE_KINDS = ['mission_defeat', 'coop_defeat'];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const RETENTION_DAYS = 7;

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
 * @param {'mission_victory'|'mission_defeat'|'coop_victory'|'coop_defeat'} kind
 * @param {{ missionKey?: string|null }} [opts]
 */
export async function recordActivityEvent(userId, kind, { missionKey = null } = {}) {
  if (!userId || !KINDS.has(kind)) return { skipped: true };
  if (!(await tableExists('community_activity_events'))) {
    return { skipped: true, reason: 'table_missing' };
  }

  const profiles = await query(
    `SELECT character_faction_id AS faction_id
     FROM player_profiles
     WHERE user_id = ? AND character_name IS NOT NULL
     LIMIT 1`,
    [userId],
  );
  const factionId = profiles[0]?.faction_id || null;

  await query(
    `INSERT INTO community_activity_events (user_id, faction_id, kind, mission_key, created_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))`,
    [
      userId,
      isValidFactionId(factionId) ? factionId : null,
      kind,
      missionKey != null ? String(missionKey).slice(0, 64) : null,
    ],
  );
  return { ok: true };
}

function parseCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  const [createdAt, idRaw] = cursor.split('|');
  const id = Number(idRaw);
  if (!createdAt || !Number.isSafeInteger(id) || id <= 0) return null;
  return { createdAt, id };
}

function encodeCursor(createdAt, id) {
  const iso =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : new Date(createdAt).toISOString();
  return `${iso}|${id}`;
}

/**
 * @param {{
 *   limit?: number,
 *   cursor?: string|null,
 *   factionId?: string|null,
 *   outcome?: 'success'|'failure'|null,
 * }} [opts]
 */
export async function listActivityFeed({
  limit = DEFAULT_LIMIT,
  cursor = null,
  factionId = null,
  outcome = null,
} = {}) {
  if (!(await tableExists('community_activity_events'))) {
    return { events: [], nextCursor: null, hasMore: false };
  }

  const capped = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  const where = ['1=1'];
  const params = [];

  if (isValidFactionId(factionId)) {
    where.push('e.faction_id = ?');
    params.push(factionId);
  }

  if (outcome === 'success') {
    where.push(`e.kind IN (${SUCCESS_KINDS.map(() => '?').join(',')})`);
    params.push(...SUCCESS_KINDS);
  } else if (outcome === 'failure') {
    where.push(`e.kind IN (${FAILURE_KINDS.map(() => '?').join(',')})`);
    params.push(...FAILURE_KINDS);
  }

  const parsed = parseCursor(cursor);
  if (parsed) {
    where.push('(e.created_at < ? OR (e.created_at = ? AND e.id < ?))');
    params.push(parsed.createdAt, parsed.createdAt, parsed.id);
  }

  const rows = await query(
    `SELECT e.id, e.user_id, e.faction_id, e.kind, e.mission_key, e.created_at,
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
            p.character_faction_id AS profile_faction_id
     FROM community_activity_events e
     JOIN player_profiles p ON p.user_id = e.user_id AND p.character_name IS NOT NULL
     WHERE ${where.join(' AND ')}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ${capped + 1}`,
    params,
  );

  const page = rows.slice(0, capped);
  const hasMore = rows.length > capped;
  const events = [];
  for (const row of page) {
    const [grantedNicknameIds, grantedFrameIds, grantedCardEffectIds] = await Promise.all([
      listGrantedNicknameIds(row.user_id),
      listGrantedFrameIds(row.user_id),
      listGrantedCardEffectIds(row.user_id),
    ]);
    const snapshotRow = {
      ...row,
      faction_id: row.faction_id || row.profile_faction_id,
    };
    events.push({
      id: row.id,
      kind: row.kind,
      missionKey: row.mission_key,
      createdAt: row.created_at,
      player: buildPublicPlayerSnapshot(snapshotRow, {
        grantedNicknameIds,
        grantedFrameIds,
        grantedCardEffectIds,
      }),
    });
  }

  const last = page[page.length - 1];
  return {
    events,
    nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
    hasMore,
  };
}

export async function purgeOldActivityEvents() {
  if (!(await tableExists('community_activity_events'))) return { deleted: 0 };
  const result = await query(
    `DELETE FROM community_activity_events
     WHERE created_at < (UTC_TIMESTAMP(6) - INTERVAL ? DAY)`,
    [RETENTION_DAYS],
  );
  return { deleted: Number(result?.affectedRows) || 0 };
}
