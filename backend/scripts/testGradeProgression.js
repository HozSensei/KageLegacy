import {
  computeChuninExamCost,
  getGradeCap,
  hasStagnationGrace,
  isChuninStagnant,
  isGeninStagnant,
  isStatAtGradeCap,
  shouldApplyStagnationPenalty,
} from '../src/services/gradeProgression.js';
import { computeChuninPromotionRewards } from '../src/services/chuninPromotionRewards.js';

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
console.assert(computeChuninExamCost() === 0);

const rewardsMin = computeChuninPromotionRewards({
  ...geninReady,
  taijutsu: 8,
  ninjutsu: 8,
  genjutsu: 8,
  medecine: 8,
  vitesse: 8,
  intelligence: 8,
  moral: 10,
  weekly_forme: 'Passable',
});
console.assert(rewardsMin.ryos === 300, 'ryos min');
console.assert(rewardsMin.reputation === 1, 'rep min');

const rewardsMax = computeChuninPromotionRewards({
  ...geninReady,
  taijutsu: 12,
  ninjutsu: 12,
  genjutsu: 12,
  medecine: 12,
  vitesse: 10,
  intelligence: 10,
  moral: 8,
  weekly_forme: 'Lamentable',
});
console.assert(rewardsMax.ryos === 1000, 'ryos max');
console.assert(rewardsMax.reputation === 4, 'rep high');
console.assert(rewardsMax.newForme === 'Passable', 'forme boost');

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
