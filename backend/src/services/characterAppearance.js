import {
  CARD_BACKGROUND_IDS,
  isKnownCardBackgroundId,
} from '../../../shared/character/cardBackgrounds.js';
import {
  isProfileColor,
  normalizeProfileColor,
} from '../../../shared/character/profileColors.js';
import {
  PROFILE_FRAME_CATALOG,
  PROFILE_FRAME_IDS,
  getProfileFrame,
  isKnownProfileFrameId,
} from '../../../shared/character/profileFrames.js';
import {
  PROFILE_CARD_EFFECT_CATALOG,
  PROFILE_CARD_EFFECT_IDS,
  getProfileCardEffect,
  isKnownProfileCardEffectId,
} from '../../../shared/character/profileCardEffects.js';

export {
  CARD_BACKGROUND_IDS,
  isKnownCardBackgroundId,
  isProfileColor,
  normalizeProfileColor,
  PROFILE_FRAME_CATALOG,
  PROFILE_FRAME_IDS,
  getProfileFrame,
  isKnownProfileFrameId,
  PROFILE_CARD_EFFECT_CATALOG,
  PROFILE_CARD_EFFECT_IDS,
  getProfileCardEffect,
  isKnownProfileCardEffectId,
};

export const ASPIRANT_RANK = 'Aspirant ninja';
export const DEFAULT_AVATAR_ID = 'aspirant-1-1';
export const MAX_LEVEL = 80;

const ranks = [
  { rank: ASPIRANT_RANK, id: 'aspirant', minLevel: 1 },
  {
    rank: 'Genin',
    id: 'genin',
    minLevel: 5,
    name: { en: 'Rising Shinobi', fr: 'Shinobi en devenir' },
  },
  {
    rank: 'Chunin',
    id: 'chunin',
    minLevel: 20,
    name: { en: 'Field Veteran', fr: 'Vétéran du terrain' },
  },
  { rank: 'Jonin', id: 'jonin', minLevel: 40, name: { en: 'Shinobi Elite', fr: 'Élite shinobi' } },
  { rank: 'ANBU', id: 'anbu', minLevel: 60, name: { en: 'Silent Blade', fr: 'Lame silencieuse' } },
  {
    rank: 'Kage',
    id: 'kage',
    minLevel: MAX_LEVEL,
    name: { en: 'Village Legend', fr: 'Légende du village' },
  },
];

const rankIndex = new Map(ranks.map(({ rank }, index) => [rank, index]));
const avatarRankIndex = new Map();
for (const [index, { id }] of ranks.slice(0, -1).entries()) {
  for (let sheet = 1; sheet <= 2; sheet += 1) {
    for (let tile = 1; tile <= 16; tile += 1) {
      avatarRankIndex.set(`${id}-${sheet}-${tile}`, index);
    }
  }
}

export const RANK_NICKNAME_CATALOG = Object.freeze(
  ranks.slice(1).map(({ id, name, minLevel }) =>
    Object.freeze({
      id,
      name: Object.freeze(name),
      criteria: Object.freeze({ minLevel }),
    }),
  ),
);

/** Titre one-shot pack bienvenue (hors progression de rang). */
export const WELCOME_NICKNAME = Object.freeze({
  id: 'welcome',
  name: Object.freeze({ en: 'Village Patron', fr: 'Mécène du Village' }),
  criteria: Object.freeze({ source: 'welcome' }),
});

/** Titres débloqués en complétant une famille (catégorie) du registre des exploits. */
export const ACHIEVEMENT_FAMILY_NICKNAMES = Object.freeze([
  Object.freeze({
    id: 'ach_combat',
    category: 'combat',
    name: Object.freeze({ en: 'Proven Blade', fr: 'Lame éprouvée' }),
    criteria: Object.freeze({ source: 'achievement_family', category: 'combat' }),
  }),
  Object.freeze({
    id: 'ach_missions',
    category: 'missions',
    name: Object.freeze({ en: 'Pathfinder', fr: 'Éclaireur des sentiers' }),
    criteria: Object.freeze({ source: 'achievement_family', category: 'missions' }),
  }),
  Object.freeze({
    id: 'ach_collection',
    category: 'collection',
    name: Object.freeze({ en: 'Archivist', fr: 'Archiviste du clan' }),
    criteria: Object.freeze({ source: 'achievement_family', category: 'collection' }),
  }),
  Object.freeze({
    id: 'ach_mastery',
    category: 'mastery',
    name: Object.freeze({ en: 'Art Master', fr: 'Maître des arts' }),
    criteria: Object.freeze({ source: 'achievement_family', category: 'mastery' }),
  }),
  Object.freeze({
    id: 'ach_progression',
    category: 'progression',
    name: Object.freeze({ en: 'Ascending Path', fr: 'Voie ascendante' }),
    criteria: Object.freeze({ source: 'achievement_family', category: 'progression' }),
  }),
]);

/** Catalogue de base exposé API (rangs + bienvenue + familles). Les titres de saison sont fusionnés à la volée. */
export const NICKNAME_CATALOG = Object.freeze([
  ...RANK_NICKNAME_CATALOG,
  WELCOME_NICKNAME,
  ...ACHIEVEMENT_FAMILY_NICKNAMES,
]);

export function seasonNicknameId(seasonNumber) {
  const n = Math.max(1, Number(seasonNumber) || 1);
  return `season_${n}`;
}

export function seasonFreeNicknameId(seasonNumber) {
  const n = Math.max(1, Number(seasonNumber) || 1);
  return `season_${n}_free`;
}

export function buildSeasonNicknameEntry(seasonNumber) {
  const n = Math.max(1, Number(seasonNumber) || 1);
  return Object.freeze({
    id: seasonNicknameId(n),
    name: Object.freeze({
      en: `Season ${n} Shadow`,
      fr: `Ombre de la Saison ${n}`,
    }),
    criteria: Object.freeze({ source: 'season', seasonNumber: n }),
  });
}

export function buildSeasonFreeNicknameEntry(seasonNumber) {
  const n = Math.max(1, Number(seasonNumber) || 1);
  return Object.freeze({
    id: seasonFreeNicknameId(n),
    name: Object.freeze({
      en: `Season ${n} Scout`,
      fr: `Éclaireur de la Saison ${n}`,
    }),
    criteria: Object.freeze({ source: 'season_free', seasonNumber: n }),
  });
}

export function achievementFamilyNicknameForCategory(category) {
  return ACHIEVEMENT_FAMILY_NICKNAMES.find(entry => entry.category === category) || null;
}

export function isKnownNicknameId(nicknameId, extraCatalog = []) {
  if (!nicknameId) return false;
  if (NICKNAME_CATALOG.some(entry => entry.id === nicknameId)) return true;
  if (/^season_\d+(_free)?$/.test(String(nicknameId))) return true;
  if (String(nicknameId).startsWith('ach_')) return true;
  return extraCatalog.some(entry => entry.id === nicknameId);
}

/**
 * @param {object} row
 * @param {string[]} [grantedIds] unlocks DB (welcome / saison)
 */
export function unlockedRankNicknameIdsFor(row) {
  const highestLevel = Math.max(
    Number(row?.character_highest_level ?? row?.highest_level) || 1,
    Number(row?.character_level ?? row?.level) || 1,
  );
  return RANK_NICKNAME_CATALOG.filter(({ criteria }) => highestLevel >= criteria.minLevel).map(
    ({ id }) => id,
  );
}

/**
 * @param {object} row
 * @param {string[]} [grantedIds]
 */
export function unlockedNicknameIdsFor(row, grantedIds = []) {
  const granted = Array.isArray(grantedIds)
    ? grantedIds.filter(id => typeof id === 'string' && id.length > 0)
    : [];
  return [...new Set([...unlockedRankNicknameIdsFor(row), ...granted])];
}

export function mergeNicknameCatalog(extraEntries = []) {
  const byId = new Map(NICKNAME_CATALOG.map(entry => [entry.id, entry]));
  for (const entry of extraEntries) {
    if (entry?.id && !byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

export function rankForLevel(level) {
  return ranks.findLast(({ minLevel }) => Number(level) >= minLevel)?.rank ?? ASPIRANT_RANK;
}

export function isKnownAvatarId(avatarId) {
  return avatarRankIndex.has(avatarId);
}

export function isAvatarAvailableToRank(avatarId, rank) {
  return avatarRankIndex.get(avatarId) <= rankIndex.get(rank);
}

/**
 * Serialize a raw player_profiles row (or its equivalent aliased projection).
 * @param {object} row
 * @param {string[]} [grantedNicknameIds]
 * @param {string[]} [grantedFrameIds]
 * @param {string[]} [grantedCardEffectIds]
 */
export function serializeCharacterAppearance(
  row,
  grantedNicknameIds = [],
  grantedFrameIds = [],
  grantedCardEffectIds = [],
) {
  const rank = row?.character_rank ?? row?.rank ?? rankForLevel(row?.character_level ?? row?.level);
  const avatarId = row?.character_avatar_id ?? row?.avatar_id;
  const backgroundId = row?.character_background_id ?? row?.background_id;
  const backgroundColor = row?.character_background_color ?? row?.background_color;
  const nicknameId = row?.character_nickname_id ?? row?.nickname_id;
  const frameId = row?.character_frame_id ?? row?.frame_id;
  const cardEffectId = row?.character_card_effect_id ?? row?.card_effect_id;
  const unlocked = unlockedNicknameIdsFor(row, grantedNicknameIds);
  const unlockedFrames = Array.isArray(grantedFrameIds)
    ? grantedFrameIds.filter(id => isKnownProfileFrameId(id))
    : null;
  const unlockedCardEffects = Array.isArray(grantedCardEffectIds)
    ? grantedCardEffectIds.filter(id => isKnownProfileCardEffectId(id))
    : null;
  const resolvedFrameId =
    typeof frameId === 'string' && isKnownProfileFrameId(frameId)
      ? unlockedFrames == null || unlockedFrames.includes(frameId)
        ? frameId
        : null
      : null;
  const resolvedCardEffectId =
    typeof cardEffectId === 'string' && isKnownProfileCardEffectId(cardEffectId)
      ? unlockedCardEffects == null || unlockedCardEffects.includes(cardEffectId)
        ? cardEffectId
        : null
      : null;
  return {
    avatarId: isAvatarAvailableToRank(avatarId, rank) ? avatarId : DEFAULT_AVATAR_ID,
    backgroundId: isKnownCardBackgroundId(backgroundId) ? backgroundId : null,
    backgroundColor: normalizeProfileColor(backgroundColor),
    nicknameId: unlocked.includes(nicknameId) ? nicknameId : null,
    frameId: resolvedFrameId,
    cardEffectId: resolvedCardEffectId,
  };
}
