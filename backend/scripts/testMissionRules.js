import {
  getEligibleTiersForNinja,
  meetsTierRequirement,
  missionNetProfit,
  MISSION_TIERS,
  rollPercent,
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

console.assert(meetsTierRequirement('routine', weakGenin), 'routine open to all');
console.assert(!meetsTierRequirement('infiltration', weakGenin), 'infiltration blocked for weak');
console.assert(meetsTierRequirement('infiltration', scout), 'infiltration via intelligence');
console.assert(meetsTierRequirement('cyclone', fighter), 'cyclone via taijutsu');

const eligible = getEligibleTiersForNinja(scout);
console.assert(
  eligible.includes('routine') && eligible.includes('infiltration') && !eligible.includes('cyclone'),
  'scout tiers'
);

console.assert(missionNetProfit('routine') === 500, 'routine max net');
console.assert(missionNetProfit('infiltration') === 800, 'infiltration max reward');
console.assert(missionNetProfit('cyclone') === 1000, 'cyclone reward');

const rolls = Array.from({ length: 1000 }, () => rollPercent());
console.assert(rolls.every((r) => r >= 1 && r <= 100), 'rollPercent range');
console.assert(MISSION_TIERS.cyclone.deathChance === 0.05, 'cyclone death rate');

console.log('missionRules OK');
