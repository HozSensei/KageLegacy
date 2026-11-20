/**
 * Accès missions PvE selon le rang du personnage (cumulatif).
 * Aspirant/Genin → D+C ; Chunin/Jonin → +B+A ; ANBU/Kage → +S.
 */
import { ASPIRANT_RANK } from './characterAppearance.js';

const MISSION_RANK_ORDER = Object.freeze(['D', 'C', 'B', 'A', 'S']);

/** Rang personnage minimal pour jouer chaque rang de mission. */
export const MISSION_RANK_REQUIRED_CHARACTER = Object.freeze({
  D: ASPIRANT_RANK,
  C: ASPIRANT_RANK,
  B: 'Chunin',
  A: 'Chunin',
  S: 'ANBU',
});

const CHARACTER_RANK_TIER = Object.freeze({
  [ASPIRANT_RANK]: 0,
  Genin: 0,
  Chunin: 1,
  Jonin: 1,
  ANBU: 2,
  Kage: 2,
});

const TIER_MAX_MISSION_RANKS = Object.freeze({
  0: Object.freeze(['D', 'C']),
  1: Object.freeze(['D', 'C', 'B', 'A']),
  2: Object.freeze(['D', 'C', 'B', 'A', 'S']),
});

export function characterAccessTier(characterRank) {
  const tier = CHARACTER_RANK_TIER[characterRank];
  return tier == null ? 0 : tier;
}

export function missionRanksForCharacterRank(characterRank) {
  return TIER_MAX_MISSION_RANKS[characterAccessTier(characterRank)] || TIER_MAX_MISSION_RANKS[0];
}

export function canPlayMissionRank(characterRank, missionRank) {
  const allowed = missionRanksForCharacterRank(characterRank);
  return allowed.includes(String(missionRank || '').toUpperCase());
}

export function requiredCharacterRankForMission(missionRank) {
  const key = String(missionRank || '').toUpperCase();
  return MISSION_RANK_REQUIRED_CHARACTER[key] || ASPIRANT_RANK;
}

export function annotateMissionAccess(mission, characterRank) {
  if (!mission) return null;
  const playable = canPlayMissionRank(characterRank, mission.rank);
  return {
    ...mission,
    playable,
    requiredCharacterRank: requiredCharacterRankForMission(mission.rank),
  };
}

export { MISSION_RANK_ORDER };
