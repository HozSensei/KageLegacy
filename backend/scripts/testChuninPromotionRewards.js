import { computeChuninPromotionRewards } from '../src/services/chuninPromotionRewards.js';

const base = {
  grade: 'Genin',
  moral: 10,
  weekly_forme: 'Excellent',
};

console.assert(
  computeChuninPromotionRewards({
    ...base,
    taijutsu: 8,
    ninjutsu: 8,
    genjutsu: 8,
    medecine: 8,
    vitesse: 8,
    intelligence: 8,
  }).ryos === 300
);

console.assert(
  computeChuninPromotionRewards({
    ...base,
    taijutsu: 12,
    ninjutsu: 12,
    genjutsu: 12,
    medecine: 12,
    vitesse: 10,
    intelligence: 10,
  }).ryos === 1000
);

console.assert(
  computeChuninPromotionRewards({
    ...base,
    taijutsu: 10,
    ninjutsu: 9,
    genjutsu: 9,
    medecine: 9,
    vitesse: 9,
    intelligence: 9,
    weekly_forme: 'Passable',
  }).newForme === 'Excellent'
);

console.log('chuninPromotionRewards: OK');
