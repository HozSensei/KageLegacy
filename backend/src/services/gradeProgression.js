import { clampStat } from './ninjaStats.js';
import { COMBAT_REQUIRED, IQ_REQUIRED, combatStat, meetsChuninRequirements } from './chuninExam.js';

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

/** Seuil combat au-delà duquel un Chunin doit préparer le Vol d'Oiseau. */
export const CHUNIN_STAGNATION_COMBAT = 17;

const CHUNIN_EXAM_BASE_COST = 300;
const CHUNIN_EXAM_COMBAT_STEP = 40;
const CHUNIN_EXAM_IQ_STEP = 30;

const BIRD_FLIGHT_BASE_COST = 800;
const BIRD_FLIGHT_COMBAT_STEP = 50;

const MAJOR_COMBAT_STATS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

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
  const extraCombat = Math.max(0, combat - CHUNIN_STAGNATION_COMBAT) * BIRD_FLIGHT_COMBAT_STEP;
  return BIRD_FLIGHT_BASE_COST + extraCombat;
}

/** Chunin prêt à s'inscrire au Vol d'Oiseau (combat ≥ 17). */
export function meetsBirdFlightRequirements(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  return combatStat(ninja) >= CHUNIN_STAGNATION_COMBAT;
}

/** Sommet d'enseignement : une stat combat majeure au plafond Chunin (18). */
export function hasReachedTeachingPeak(ninja) {
  if (ninja.grade !== 'Chunin') return false;
  return MAJOR_COMBAT_STATS.some((stat) => ninja[stat] >= getGradeCap('Chunin', stat));
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
  return combatStat(ninja) >= CHUNIN_STAGNATION_COMBAT;
}

export function isStagnant(ninja) {
  return isGeninStagnant(ninja) || isChuninStagnant(ninja);
}

export function applyStagnationPenalty(ninja) {
  const weeklyForme = FORME_DOWNGRADE[ninja.weekly_forme] || ninja.weekly_forme;
  const moral = clampStat(ninja.moral - 3);
  return { weeklyForme, moral };
}
