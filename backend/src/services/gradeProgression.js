import { clampStat } from './ninjaStats.js';
import { COMBAT_REQUIRED, IQ_REQUIRED, combatStat, meetsChuninRequirements } from './chuninExam.js';
import {
  BIRD_FLIGHT_COMBAT_REQUIRED,
  BIRD_FLIGHT_IQ_REQUIRED,
  meetsBirdFlightRequirements,
} from './birdFlightExam.js';

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

/** @deprecated Utiliser BIRD_FLIGHT_COMBAT_REQUIRED — conservé pour docs legacy. */
export const CHUNIN_STAGNATION_COMBAT = BIRD_FLIGHT_COMBAT_REQUIRED;

const CHUNIN_EXAM_BASE_COST = 300;
const CHUNIN_EXAM_COMBAT_STEP = 40;
const CHUNIN_EXAM_IQ_STEP = 30;

const BIRD_FLIGHT_BASE_COST = 800;
const BIRD_FLIGHT_COMBAT_STEP = 50;
const BIRD_FLIGHT_IQ_STEP = 40;

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
  const combat = combatStat(ninja);
  const iq = ninja.intelligence;
  const extraCombat = Math.max(0, combat - COMBAT_REQUIRED) * CHUNIN_EXAM_COMBAT_STEP;
  const extraIq = Math.max(0, iq - IQ_REQUIRED) * CHUNIN_EXAM_IQ_STEP;
  return CHUNIN_EXAM_BASE_COST + extraCombat + extraIq;
}

export function computeBirdFlightCost(ninja) {
  const combat = combatStat(ninja);
  const iq = ninja.intelligence;
  const extraCombat = Math.max(0, combat - BIRD_FLIGHT_COMBAT_REQUIRED) * BIRD_FLIGHT_COMBAT_STEP;
  const extraIq = Math.max(0, iq - BIRD_FLIGHT_IQ_REQUIRED) * BIRD_FLIGHT_IQ_STEP;
  return BIRD_FLIGHT_BASE_COST + extraCombat + extraIq;
}

export function isGeninStagnant(ninja) {
  if (ninja.grade !== 'Genin') return false;
  if (!meetsChuninRequirements(ninja)) return false;
  if (ninja.chunin_exam_requested) return false;
  return true;
}

export function isChuninStagnant(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  if (ninja.bird_flight_requested) return false;
  return meetsBirdFlightRequirements(ninja);
}

export function isStagnant(ninja) {
  return isGeninStagnant(ninja) || isChuninStagnant(ninja);
}

export function applyStagnationPenalty(ninja) {
  const weeklyForme = FORME_DOWNGRADE[ninja.weekly_forme] || ninja.weekly_forme;
  const moral = clampStat(ninja.moral - 3);
  return { weeklyForme, moral };
}
