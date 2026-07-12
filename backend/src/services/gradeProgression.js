import { clampStat } from './ninjaStats.js';
import { meetsChuninRequirements, CHUNIN_AVERAGE_REQUIRED } from './chuninExam.js';
import { meetsBirdFlightRequirements } from './birdFlightExam.js';
import { ninjaOverallRating } from './ninjaStats.js';

export { meetsBirdFlightRequirements, hasReachedTeachingPeak } from './birdFlightExam.js';

/** Plafonds d'entraînement par grade (inclusif). */
export const GRADE_STAT_CAPS = {
  Genin: {
    taijutsu: 12,
    ninjutsu: 12,
    genjutsu: 12,
    medecine: 12,
    vitesse: 10,
    intelligence: 10,
  },
  Chunin: {
    taijutsu: 18,
    ninjutsu: 18,
    genjutsu: 18,
    medecine: 18,
    vitesse: 16,
    intelligence: 16,
  },
  Jonin: {
    taijutsu: 20,
    ninjutsu: 20,
    genjutsu: 20,
    medecine: 20,
    vitesse: 20,
    intelligence: 20,
  },
};

const CHUNIN_EXAM_BASE_COST = 300;
const CHUNIN_EXAM_AVERAGE_STEP = 45;

const FORME_DOWNGRADE = {
  Divin: 'Excellent',
  Excellent: 'Passable',
  Passable: 'Lamentable',
  Lamentable: 'Lamentable',
};

export function getGradeCap(grade, stat) {
  return GRADE_STAT_CAPS[grade]?.[stat] ?? GRADE_STAT_CAPS.Genin[stat] ?? 20;
}

export function isStatAtGradeCap(ninja, stat) {
  return ninja[stat] >= getGradeCap(ninja.grade, stat);
}

export function clampStatToGradeCap(ninja, stat, value) {
  const cap = getGradeCap(ninja.grade, stat);
  return clampStat(Math.min(value, cap));
}

export function computeChuninExamCost(ninja) {
  const average = ninjaOverallRating(ninja);
  const extraAverage = Math.max(0, average - CHUNIN_AVERAGE_REQUIRED) * CHUNIN_EXAM_AVERAGE_STEP;
  return CHUNIN_EXAM_BASE_COST + extraAverage;
}

export function isGeninStagnantCandidate(ninja) {
  if (ninja.grade !== 'Genin') return false;
  if (!meetsChuninRequirements(ninja)) return false;
  if (ninja.chunin_exam_requested) return false;
  return true;
}

export function isChuninStagnantCandidate(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  if (ninja.bird_flight_requested) return false;
  return meetsBirdFlightRequirements(ninja);
}

/** Prêt à monter mais pas encore inscrit — alerte UI (cycle de grâce inclus). */
export function isGeninStagnant(ninja) {
  return isGeninStagnantCandidate(ninja);
}

export function isChuninStagnant(ninja) {
  return isChuninStagnantCandidate(ninja);
}

export function isStagnantCandidate(ninja) {
  return isGeninStagnantCandidate(ninja) || isChuninStagnantCandidate(ninja);
}

/** Pénalité H72 : après 1 cycle de grâce (stagnant_cycles ≥ 1). */
export function shouldApplyStagnationPenalty(ninja) {
  if (!isStagnantCandidate(ninja)) return false;
  return (ninja.stagnant_cycles ?? 0) >= 1;
}

export function isStagnant(ninja) {
  return shouldApplyStagnationPenalty(ninja);
}

export function hasStagnationGrace(ninja) {
  return isStagnantCandidate(ninja) && (ninja.stagnant_cycles ?? 0) < 1;
}

export function applyStagnationPenalty(ninja) {
  const weeklyForme = FORME_DOWNGRADE[ninja.weekly_forme] || ninja.weekly_forme;
  const moral = clampStat(ninja.moral - 3);
  return { weeklyForme, moral };
}
