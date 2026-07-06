import {
  getEligibleRanksForNinja,
  meetsRankRequirement,
  missionNetProfit,
} from '../src/services/missionRules.js';

const weakGenin = {
  taijutsu: 6,
  ninjutsu: 6,
  genjutsu: 6,
  medecine: 6,
  vitesse: 5,
  intelligence: 5,
};

const scout = { ...weakGenin, intelligence: 9 };
const fighter = { ...weakGenin, taijutsu: 13 };

console.assert(meetsRankRequirement('D', weakGenin), 'D open to all');
console.assert(!meetsRankRequirement('C', weakGenin), 'C blocked for weak');
console.assert(meetsRankRequirement('C', scout), 'C via intelligence');
console.assert(meetsRankRequirement('B', fighter), 'B via taijutsu');

const eligible = getEligibleRanksForNinja(scout);
console.assert(eligible.includes('D') && eligible.includes('C') && !eligible.includes('B'), 'scout ranks');

console.assert(missionNetProfit('D') === 500, 'D net');
console.assert(missionNetProfit('C') === 1100, 'C net');
console.assert(missionNetProfit('B') === 2500, 'B net');

console.log('missionRules OK');
