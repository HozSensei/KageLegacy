/**
 * Snapshot public d’un personnage — visible par les autres joueurs.
 * N’expose jamais inventaire, monnaies, email ni secrets de compte.
 */
import { query } from '../config/database.js';
import {
  DEFAULT_AVATAR_ID,
  isKnownAvatarId,
  isKnownCardBackgroundId,
  isKnownNicknameId,
  isKnownProfileCardEffectId,
  isKnownProfileFrameId,
  normalizeProfileColor,
  serializeCharacterAppearance,
} from './characterAppearance.js';
import { getFaction, isValidFactionId } from './factionCatalog.js';
import { listGrantedNicknameIds } from './nicknameUnlockService.js';
import { listGrantedFrameIds } from './frameUnlockService.js';
import { listGrantedCardEffectIds } from './cardEffectUnlockService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function sanitizeProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return {
      avatarId: DEFAULT_AVATAR_ID,
      backgroundId: null,
      backgroundColor: null,
      nicknameId: null,
      frameId: null,
      cardEffectId: null,
    };
  }
  return {
    avatarId: isKnownAvatarId(profile.avatarId) ? profile.avatarId : DEFAULT_AVATAR_ID,
    backgroundId: isKnownCardBackgroundId(profile.backgroundId) ? profile.backgroundId : null,
    backgroundColor: normalizeProfileColor(profile.backgroundColor),
    nicknameId: isKnownNicknameId(profile.nicknameId) ? profile.nicknameId : null,
    frameId: isKnownProfileFrameId(profile.frameId) ? profile.frameId : null,
    cardEffectId: isKnownProfileCardEffectId(profile.cardEffectId) ? profile.cardEffectId : null,
  };
}

/**
 * Construit un snapshot public depuis une ligne player_profiles (alias ou colonnes brutes).
 */
export function buildPublicPlayerSnapshot(row, extras = {}) {
  if (!row) return null;
  const userId = Number(row.user_id ?? row.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) return null;

  const grantedNicknameIds = extras.grantedNicknameIds || [];
  const grantedFrameIds = extras.grantedFrameIds || [];
  const grantedCardEffectIds = extras.grantedCardEffectIds || [];
  const appearance = serializeCharacterAppearance(
    row,
    grantedNicknameIds,
    grantedFrameIds,
    grantedCardEffectIds,
  );
  const factionId = row.faction_id ?? row.character_faction_id ?? extras.factionId ?? null;
  const name =
    row.name ||
    row.character_name ||
    row.display_name ||
    extras.name ||
    null;
  const level = Number(row.level ?? row.character_level) || 1;
  const rank = row.rank ?? row.character_rank ?? null;

  return {
    userId,
    name: typeof name === 'string' && name.trim() ? name.trim() : `Ninja #${userId}`,
    level,
    rank: typeof rank === 'string' ? rank : null,
    factionId: isValidFactionId(factionId) ? factionId : null,
    faction: isValidFactionId(factionId) ? getFaction(factionId) : null,
    profile: sanitizeProfile(appearance),
  };
}

const PUBLIC_SELECT = `SELECT p.user_id,
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
     FROM player_profiles p
     WHERE p.user_id = ? AND p.character_name IS NOT NULL
     LIMIT 1`;

const PUBLIC_SELECT_LEGACY = `SELECT p.user_id,
            p.character_name AS name,
            p.character_avatar_id,
            p.character_background_id,
            p.character_background_color,
            p.character_nickname_id,
            NULL AS character_frame_id,
            NULL AS character_card_effect_id,
            p.character_highest_level,
            p.character_level AS level,
            p.character_rank AS \`rank\`,
            p.character_faction_id AS faction_id
     FROM player_profiles p
     WHERE p.user_id = ? AND p.character_name IS NOT NULL
     LIMIT 1`;

export async function getPublicPlayer(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0) throw httpError(400, 'Identifiant invalide.');

  let rows;
  try {
    rows = await query(PUBLIC_SELECT, [id]);
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
    rows = await query(PUBLIC_SELECT_LEGACY, [id]);
  }
  const row = rows[0];
  if (!row) throw httpError(404, 'Joueur introuvable.');

  const [grantedNicknameIds, grantedFrameIds, grantedCardEffectIds] = await Promise.all([
    listGrantedNicknameIds(id),
    listGrantedFrameIds(id),
    listGrantedCardEffectIds(id),
  ]);
  return buildPublicPlayerSnapshot(row, {
    grantedNicknameIds,
    grantedFrameIds,
    grantedCardEffectIds,
  });
}

/**
 * Charge plusieurs snapshots publics (ordre non garanti → Map userId → snapshot).
 * @param {number[]} userIds
 */
export async function getPublicPlayersMap(userIds = []) {
  const ids = [
    ...new Set(
      (userIds || [])
        .map(id => Number(id))
        .filter(id => Number.isSafeInteger(id) && id > 0),
    ),
  ];
  if (!ids.length) return new Map();

  const placeholders = ids.map(() => '?').join(', ');
  let rows;
  try {
    rows = await query(
      `SELECT p.user_id,
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
       FROM player_profiles p
       WHERE p.user_id IN (${placeholders}) AND p.character_name IS NOT NULL`,
      ids,
    );
  } catch (err) {
    // Bases pas encore migrées : colonnes frame / card effect absentes.
    if (err?.code === 'ER_BAD_FIELD_ERROR') {
      rows = await query(
        `SELECT p.user_id,
                p.character_name AS name,
                p.character_avatar_id,
                p.character_background_id,
                p.character_background_color,
                p.character_nickname_id,
                NULL AS character_frame_id,
                NULL AS character_card_effect_id,
                p.character_highest_level,
                p.character_level AS level,
                p.character_rank AS \`rank\`,
                p.character_faction_id AS faction_id
         FROM player_profiles p
         WHERE p.user_id IN (${placeholders}) AND p.character_name IS NOT NULL`,
        ids,
      );
    } else {
      throw err;
    }
  }

  const map = new Map();
  await Promise.all(
    rows.map(async row => {
      const [grantedNicknameIds, grantedFrameIds, grantedCardEffectIds] = await Promise.all([
        listGrantedNicknameIds(row.user_id),
        listGrantedFrameIds(row.user_id),
        listGrantedCardEffectIds(row.user_id),
      ]);
      map.set(
        row.user_id,
        buildPublicPlayerSnapshot(row, {
          grantedNicknameIds,
          grantedFrameIds,
          grantedCardEffectIds,
        }),
      );
    }),
  );
  return map;
}

/**
 * Projection légère pour listes (amis, classement) — même forme que getPublicPlayer.
 */
export function attachPublicSnapshot(base, snapshot) {
  if (!snapshot) return base;
  return {
    ...base,
    name: snapshot.name || base.name,
    level: snapshot.level ?? base.level,
    rank: snapshot.rank ?? base.rank,
    factionId: snapshot.factionId ?? base.factionId ?? null,
    profile: snapshot.profile,
  };
}
