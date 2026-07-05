import {
  computeChuninExamCost,
  getGradeCap,
  isChuninStagnant,
  isGeninStagnant,
  isStatAtGradeCap,
} from '../src/services/gradeProgression.js';

const geninReady = {
  grade: 'Genin',
  taijutsu: 12,
  ninjutsu: 8,
  genjutsu: 7,
  medecine: 6,
  intelligence: 10,
  chunin_exam_requested: false,
};

console.assert(getGradeCap('Genin', 'taijutsu') === 12);
console.assert(isStatAtGradeCap(geninReady, 'taijutsu'));
console.assert(isGeninStagnant(geninReady));
console.assert(!isGeninStagnant({ ...geninReady, chunin_exam_requested: true }));
console.assert(computeChuninExamCost(geninReady) === 440);

const chuninVeteran = {
  grade: 'Chunin',
  taijutsu: 17,
  ninjutsu: 14,
  genjutsu: 12,
  medecine: 11,
  intelligence: 14,
};
console.assert(isChuninStagnant(chuninVeteran));
console.assert(!isChuninStagnant({ ...chuninVeteran, intelligence: 12 }));

console.log('gradeProgression: OK');
