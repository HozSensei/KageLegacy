import aspirant1 from '../assets/avatars/Aspirant.png';
import aspirant2 from '../assets/avatars/Aspirant-2.png';
import genin1 from '../assets/avatars/Genin.png';
import genin2 from '../assets/avatars/Genin-2.png';
import chunin1 from '../assets/avatars/Chunin.png';
import chunin2 from '../assets/avatars/Chunin-2.png';
import jonin1 from '../assets/avatars/jonin.png';
import jonin2 from '../assets/avatars/jonin-2.png';
import anbu1 from '../assets/avatars/Anbu.png';
import anbu2 from '../assets/avatars/Anbu-2.png';

export const STARTING_NINJA_RANK = 'Aspirant ninja';
export const DEFAULT_NINJA_AVATAR_ID = 'aspirant-1-1';
export const NINJA_AVATAR_GRID_SIZE = 4;

const sheetsByRank = {
  aspirant: [aspirant1, aspirant2],
  genin: [genin1, genin2],
  chunin: [chunin1, chunin2],
  jonin: [jonin1, jonin2],
  anbu: [anbu1, anbu2],
};
const avatarsById = new Map();

export const NINJA_AVATAR_GROUPS = Object.entries(sheetsByRank).map(([rank, sheets]) => ({
  rank,
  sheets: sheets.map((image, sheetIndex) =>
    Array.from({ length: NINJA_AVATAR_GRID_SIZE ** 2 }, (_, index) => {
      const id = `${rank}-${sheetIndex + 1}-${index + 1}`;
      avatarsById.set(
        id,
        Object.freeze({
          image,
          column: index % NINJA_AVATAR_GRID_SIZE,
          row: Math.floor(index / NINJA_AVATAR_GRID_SIZE),
        })
      );
      return id;
    })
  ),
}));

/** Avatar IDs are numbered from 1 in row-major order; sprite coordinates are zero-based. */
export function getNinjaAvatar(avatarId) {
  return avatarsById.get(avatarId) ?? null;
}

export function getNinjaRankKey(rank) {
  const key = String(rank ?? '')
    .trim()
    .toLowerCase();
  return key === 'aspirant ninja' ? 'aspirant' : key;
}

export function canUseNinjaAvatarRank(avatarRank, characterRank) {
  const required = NINJA_AVATAR_GROUPS.findIndex(group => group.rank === avatarRank);
  const key = getNinjaRankKey(characterRank);
  const current =
    key === 'kage'
      ? NINJA_AVATAR_GROUPS.length
      : Math.max(
          0,
          NINJA_AVATAR_GROUPS.findIndex(group => group.rank === key)
        );
  return required >= 0 && required <= current;
}
