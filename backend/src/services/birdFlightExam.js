import { combatStat } from './chuninExam.js';

/** Miroir de l'examen Chunin : seuils = plafond du grade − 2. */
export const BIRD_FLIGHT_COMBAT_REQUIRED = 16;
export const BIRD_FLIGHT_IQ_REQUIRED = 14;
const CHUNIN_COMBAT_CAP = 18;
const CHUNIN_IQ_CAP = 16;

export function meetsBirdFlightRequirements(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  return (
    combatStat(ninja) >= BIRD_FLIGHT_COMBAT_REQUIRED &&
    ninja.intelligence >= BIRD_FLIGHT_IQ_REQUIRED
  );
}

export function getBirdFlightProgress(ninja) {
  const combat = combatStat(ninja);
  const intelligence = ninja.intelligence;
  return {
    combat,
    combatRequired: BIRD_FLIGHT_COMBAT_REQUIRED,
    intelligence,
    intelligenceRequired: BIRD_FLIGHT_IQ_REQUIRED,
    ready: meetsBirdFlightRequirements(ninja),
    combatRatio: Math.min(1, combat / BIRD_FLIGHT_COMBAT_REQUIRED),
    intelligenceRatio: Math.min(1, intelligence / BIRD_FLIGHT_IQ_REQUIRED),
  };
}

/** Sommet d'enseignement : combat et QI au plafond Chunin (18 / 16). */
export function hasReachedTeachingPeak(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  return combatStat(ninja) >= CHUNIN_COMBAT_CAP && ninja.intelligence >= CHUNIN_IQ_CAP;
}
