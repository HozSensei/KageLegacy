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

export const NICKNAME_CATALOG = Object.freeze(
  ranks.slice(1).map(({ id, name, minLevel }) =>
    Object.freeze({
      id,
      name: Object.freeze(name),
      criteria: Object.freeze({ minLevel }),
    }),
  ),
);

/** Fonds illustrés disponibles pour la carte ninja du joueur. */
export const CARD_BACKGROUND_IDS = Object.freeze(['joueur-1', 'joueur-2']);
const cardBackgroundIds = new Set(CARD_BACKGROUND_IDS);

export function rankForLevel(level) {
  return ranks.findLast(({ minLevel }) => Number(level) >= minLevel)?.rank ?? ASPIRANT_RANK;
}

export function isKnownAvatarId(avatarId) {
  return avatarRankIndex.has(avatarId);
}

export function isAvatarAvailableToRank(avatarId, rank) {
  return avatarRankIndex.get(avatarId) <= rankIndex.get(rank);
}

export function isKnownCardBackgroundId(backgroundId) {
  return cardBackgroundIds.has(backgroundId);
}

export function unlockedNicknameIdsFor(row) {
  const highestLevel = Math.max(
    Number(row?.character_highest_level ?? row?.highest_level) || 1,
    Number(row?.character_level ?? row?.level) || 1,
  );
  return NICKNAME_CATALOG.filter(({ criteria }) => highestLevel >= criteria.minLevel).map(
    ({ id }) => id,
  );
}

/** Serialize a raw player_profiles row (or its equivalent aliased projection). */
export function serializeCharacterAppearance(row) {
  const rank = row?.character_rank ?? row?.rank ?? rankForLevel(row?.character_level ?? row?.level);
  const avatarId = row?.character_avatar_id ?? row?.avatar_id;
  const backgroundId = row?.character_background_id ?? row?.background_id;
  const nicknameId = row?.character_nickname_id ?? row?.nickname_id;
  return {
    avatarId: isAvatarAvailableToRank(avatarId, rank) ? avatarId : DEFAULT_AVATAR_ID,
    backgroundId: isKnownCardBackgroundId(backgroundId) ? backgroundId : null,
    nicknameId: unlockedNicknameIdsFor(row).includes(nicknameId) ? nicknameId : null,
  };
}
