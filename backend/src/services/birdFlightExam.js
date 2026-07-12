import { ninjaOverallRating } from './ninjaStats.js';
import { combatStat } from './chuninExam.js';

/** Note moyenne globale requise pour le Vol d'Oiseau (Chunin → départ). */
export const BIRD_FLIGHT_AVERAGE_REQUIRED = 14;

/** Plafond Chunin : moyenne max théorique (18×4 + 16×2) / 6 ≈ 17. */
const CHUNIN_AVERAGE_CAP = 17;

/** @deprecated */
export const BIRD_FLIGHT_COMBAT_REQUIRED = 16;
export const BIRD_FLIGHT_IQ_REQUIRED = 14;

export function getGradeAverageCap(grade) {
  if (grade === 'Chunin') return CHUNIN_AVERAGE_CAP;
  if (grade === 'Genin') return Math.round((12 * 4 + 10 * 2) / 6);
  return 20;
}

export function meetsBirdFlightRequirements(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  return ninjaOverallRating(ninja) >= BIRD_FLIGHT_AVERAGE_REQUIRED;
}

export function getBirdFlightProgress(ninja) {
  const average = ninjaOverallRating(ninja);
  return {
    average,
    averageRequired: BIRD_FLIGHT_AVERAGE_REQUIRED,
    ready: meetsBirdFlightRequirements(ninja),
    averageRatio: Math.min(1, average / BIRD_FLIGHT_AVERAGE_REQUIRED),
    /** @deprecated */
    combat: combatStat(ninja),
    combatRequired: BIRD_FLIGHT_COMBAT_REQUIRED,
    intelligence: ninja.intelligence,
    intelligenceRequired: BIRD_FLIGHT_IQ_REQUIRED,
    combatRatio: Math.min(1, combatStat(ninja) / BIRD_FLIGHT_COMBAT_REQUIRED),
    intelligenceRatio: Math.min(1, ninja.intelligence / BIRD_FLIGHT_IQ_REQUIRED),
  };
}

/** Sommet d'enseignement : note moyenne au plafond Chunin. */
export function hasReachedTeachingPeak(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  return ninjaOverallRating(ninja) >= CHUNIN_AVERAGE_CAP;
}
