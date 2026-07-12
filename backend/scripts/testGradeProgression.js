import {
  computeChuninExamCost,
  getGradeCap,
  hasStagnationGrace,
  isChuninStagnant,
  isGeninStagnant,
  isStatAtGradeCap,
  shouldApplyStagnationPenalty,
} from '../src/services/gradeProgression.js';

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

console.assert(getGradeCap('Genin', 'taijutsu') === 12);
console.assert(isStatAtGradeCap(geninReady, 'taijutsu'));
console.assert(isGeninStagnant(geninReady));
console.assert(hasStagnationGrace(geninReady));
console.assert(!shouldApplyStagnationPenalty(geninReady));
console.assert(shouldApplyStagnationPenalty({ ...geninReady, stagnant_cycles: 1 }));
console.assert(!isGeninStagnant({ ...geninReady, chunin_exam_requested: true }));
console.assert(computeChuninExamCost(geninReady) === 345);

const chuninVeteran = {
  grade: 'Chunin',
  taijutsu: 17,
  ninjutsu: 14,
  genjutsu: 12,
  medecine: 11,
  vitesse: 14,
  intelligence: 14,
};
console.assert(isChuninStagnant(chuninVeteran));
console.assert(!isChuninStagnant({ ...chuninVeteran, intelligence: 12 }));

console.log('gradeProgression: OK');
