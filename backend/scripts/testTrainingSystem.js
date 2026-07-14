import {
  computeTrainingPart,
  distributePart,
  getPotentialMultiplier,
  getTrainingGainRange,
  PREP_COEF,
  GLOBAL_COEF,
  TRAINING_TYPES,
} from '../src/services/training.js';
import {
  hasStagnationGrace,
  isGeninStagnant,
  shouldApplyStagnationPenalty,
} from '../src/services/gradeProgression.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approx(actual, expected, epsilon = 0.001) {
  assert(Math.abs(actual - expected) < epsilon, `expected ~${expected}, got ${actual}`);
}

const genin = {
  grade: 'Genin',
  age: 16,
  potential: 'ordinaire',
  taijutsu: 5,
  ninjutsu: 6,
  genjutsu: 4,
  medecine: 4,
  vitesse: 5,
  intelligence: 4,
  character_trait: 'Discipline',
};

const prodige = { ...genin, potential: 'prodige', ninjutsu: 9, intelligence: 6 };

console.log('=== testTrainingSystem ===');

const prepRange = getTrainingGainRange(PREP_COEF, 'preparation', genin);
approx(prepRange.avg, 0.7);
approx(prepRange.min, 0.525);
approx(prepRange.max, 0.875);

const globalRange = getTrainingGainRange(GLOBAL_COEF, 'global', genin);
approx(globalRange.avg, 0.35);

assert(getPotentialMultiplier('prodige') === 1.25, 'prodige mult');
assert(getPotentialMultiplier('prometteur') === 1.1, 'prometteur mult');

const part = computeTrainingPart(PREP_COEF, 'preparation', genin, { rngMultiplier: 1 });
approx(part, 0.7);

const distribution = distributePart(0.7, 'Ninjutsu', genin, 'global', { rng: () => 0 });
assert(distribution.gains.length === 3, 'Ninjutsu type touche 3 stats');
assert(
  Math.abs(distribution.gains.reduce((sum, gain) => sum + gain.gain, 0) - 0.7) < 0.01,
  'distribution conserve le pot'
);

const prodigePart = computeTrainingPart(PREP_COEF, 'preparation', prodige, { rngMultiplier: 1 });
approx(prodigePart, 0.875);

const geninReady = {
  grade: 'Genin',
  taijutsu: 12,
  ninjutsu: 8,
  genjutsu: 7,
  medecine: 6,
  vitesse: 10,
  intelligence: 10,
  chunin_exam_requested: false,
  stagnant_cycles: 0,
};
assert(isGeninStagnant(geninReady), 'candidate stagnation UI');
assert(!shouldApplyStagnationPenalty(geninReady), 'grace cycle 0');
assert(hasStagnationGrace(geninReady), 'has grace');
assert(shouldApplyStagnationPenalty({ ...geninReady, stagnant_cycles: 1 }), 'penalty after grace');

assert(TRAINING_TYPES.Chakra.stats.length === 3, 'Chakra group');
assert(TRAINING_TYPES.Equilibre.stats.length === 3, 'Equilibre group');

const prepChakra = getTrainingGainRange(PREP_COEF, 'preparation', genin);
const globalChakra = getTrainingGainRange(GLOBAL_COEF, 'global', genin);
approx(prepChakra.avg + globalChakra.avg, 1.05);

const prepOnly = distributePart(0.7, 'Chakra', genin, 'preparation', { rng: () => 0.5 });
assert(prepOnly.gains.length === 3, 'Chakra touche 3 stats');

console.log('testTrainingSystem: OK');
