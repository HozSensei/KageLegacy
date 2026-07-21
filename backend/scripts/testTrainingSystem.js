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
  character_trait: 'Brute',
};

const prodige = { ...genin, potential: 'prodige', ninjutsu: 9, intelligence: 6 };

console.log('=== testTrainingSystem ===');

const prepRange = getTrainingGainRange(PREP_COEF, 'preparation', genin);
approx(prepRange.avg, 3.2);
approx(prepRange.min, 2.4);
approx(prepRange.max, 4.0);

const globalRange = getTrainingGainRange(GLOBAL_COEF, 'global', genin);
approx(globalRange.avg, 1.6);

assert(getPotentialMultiplier('prodige') === 2.2, 'prodige mult');
assert(getPotentialMultiplier('prometteur') === 1.5, 'prometteur mult');

const part = computeTrainingPart(PREP_COEF, 'preparation', genin, { rngMultiplier: 1 });
approx(part, 3.2);

const distribution = distributePart(3.2, 'Ninjutsu', genin, 'global', { rng: () => 0 });
assert(distribution.gains.length === 3, 'Ninjutsu type touche 3 stats');
assert(
  Math.abs(distribution.gains.reduce((sum, gain) => sum + gain.gain, 0) - 3.2) < 0.01,
  'distribution conserve le pot'
);

const prodigePart = computeTrainingPart(PREP_COEF, 'preparation', prodige, { rngMultiplier: 1 });
approx(prodigePart, 7.04);

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
approx(prepChakra.avg + globalChakra.avg, 4.8);

const prepOnly = distributePart(3.2, 'Chakra', genin, 'preparation', { rng: () => 0.5 });
assert(prepOnly.gains.length === 3, 'Chakra touche 3 stats');

// Écart talent : prodige gagne nettement plus vite qu'ordinaire (×2,2).
assert(
  getPotentialMultiplier('prodige') / getPotentialMultiplier('ordinaire') >= 2,
  'prodige au moins 2× plus rapide qu\'ordinaire'
);
assert(
  getPotentialMultiplier('prometteur') / getPotentialMultiplier('ordinaire') >= 1.4,
  'prometteur nettement plus rapide qu\'ordinaire'
);

// Smoke : avec prep+global, un prodige gagne nettement plus de capital qu'un ordinaire.
const ordinaryAvg = getTrainingGainRange(PREP_COEF, 'preparation', genin).avg
  + getTrainingGainRange(GLOBAL_COEF, 'global', genin).avg;
const prodigeAvg = getTrainingGainRange(PREP_COEF, 'preparation', prodige).avg
  + getTrainingGainRange(GLOBAL_COEF, 'global', prodige).avg;
assert(prodigeAvg > ordinaryAvg * 1.9, `écart capital prodige/ordinaire trop faible (${prodigeAvg} vs ${ordinaryAvg})`);

console.log('testTrainingSystem: OK', {
  ordinaryCapitalPerCycle: ordinaryAvg,
  prodigeCapitalPerCycle: prodigeAvg,
  ratio: Number((prodigeAvg / ordinaryAvg).toFixed(2)),
});
