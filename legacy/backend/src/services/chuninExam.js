import { ninjaOverallRating } from './ninjaStats.js';

/** Note moyenne globale requise pour l'examen Chunin (Genin). */
export const CHUNIN_AVERAGE_REQUIRED = 8;

/** @deprecated Conservé pour affichage legacy / notifications */
export const COMBAT_REQUIRED = 10;
export const IQ_REQUIRED = 8;

export function combatStat(ninja) {
  return Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine);
}

export function meetsChuninRequirements(ninja) {
  return ninjaOverallRating(ninja) >= CHUNIN_AVERAGE_REQUIRED;
}

export function getChuninExamProgress(ninja) {
  const average = ninjaOverallRating(ninja);
  return {
    average,
    averageRequired: CHUNIN_AVERAGE_REQUIRED,
    ready: average >= CHUNIN_AVERAGE_REQUIRED,
    averageRatio: Math.min(1, average / CHUNIN_AVERAGE_REQUIRED),
    /** @deprecated */
    combat: combatStat(ninja),
    combatRequired: COMBAT_REQUIRED,
    intelligence: ninja.intelligence,
    intelligenceRequired: IQ_REQUIRED,
    combatRatio: Math.min(1, combatStat(ninja) / COMBAT_REQUIRED),
    intelligenceRatio: Math.min(1, ninja.intelligence / IQ_REQUIRED),
  };
}
