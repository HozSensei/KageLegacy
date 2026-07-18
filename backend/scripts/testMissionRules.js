import {
  computeMissionOddsForTier,
  computeMissionResolvesAtHour,
  getEligibleTiersForNinja,
  getRecommendedTiersForNinja,
  MAX_ACTIVE_MISSIONS,
  meetsTierRequirement,
  missionFitsInCycle,
  missionNetProfit,
  MISSION_TIERS,
  MISSION_TIER_ORDER,
  normalizeMissionTier,
  rollPercent,
} from '../src/services/missionRules.js';
import { computeMissionStatGain } from '../src/services/missionLootService.js';

const weakGenin = {
  grade: 'Genin',
  taijutsu: 6,
  ninjutsu: 6,
  genjutsu: 6,
  medecine: 6,
  vitesse: 5,
  intelligence: 5,
};

const balanced = { ...weakGenin, intelligence: 7, vitesse: 7 };
const chuninReady = { ...weakGenin, taijutsu: 9, ninjutsu: 9, genjutsu: 8, medecine: 8, vitesse: 8, intelligence: 8 };

console.assert(normalizeMissionTier('routine') === 'D', 'legacy routine -> D');
console.assert(normalizeMissionTier('C') === 'C', 'rank C');
console.assert(MISSION_TIER_ORDER.length === 4, '4 mission ranks');

const weakOddsD = computeMissionOddsForTier(weakGenin, 'D');
console.assert(weakOddsD.successChance >= 50, 'weak genin decent on D');
console.assert(weakOddsD.ninjaRating === 6, 'weak rating');

const veryWeak = { ...weakGenin, intelligence: 4, vitesse: 4 };

const weakOddsC = computeMissionOddsForTier(veryWeak, 'C');
console.assert(weakOddsC.successChance < 50, `very weak genin low on C (${weakOddsC.successChance}%)`);

const readyOddsB = computeMissionOddsForTier(chuninReady, 'B');
console.assert(readyOddsB.successChance === 50, 'rating 8 on B target 8 = 50%');

console.assert(getEligibleTiersForNinja(weakGenin).length === 4, 'all ranks sendable');
const recommended = getRecommendedTiersForNinja(chuninReady);
console.assert(recommended.includes('D') && recommended.includes('B'), 'chunin ready recommends D and B');

console.assert(meetsTierRequirement('C', chuninReady), 'meetsTierRequirement uses 50% threshold');
console.assert(!meetsTierRequirement('A', weakGenin), 'weak not recommended A');

console.assert(missionNetProfit('D') === 500, 'D max reward');
console.assert(missionNetProfit('C') === 800, 'C max reward');
console.assert(missionNetProfit('B') === 1000, 'B reward');
console.assert(missionNetProfit('A') === 2000, 'A max reward');

const benchGain = computeMissionStatGain(weakGenin, 'D', { isBench: true });
console.assert(benchGain?.gain === 0.38, `bench D gain ${benchGain?.gain}`);
const activeGain = computeMissionStatGain(weakGenin, 'D', { isBench: false });
console.assert(activeGain?.gain === 0.25, 'active D gain no bench bonus');

const rolls = Array.from({ length: 1000 }, () => rollPercent());
console.assert(rolls.every((r) => r >= 1 && r <= 100), 'rollPercent range');
console.assert(MISSION_TIERS.B.baseDeathChance === 5, 'B base death');

console.assert(MISSION_TIERS.D.durationHours === 4, 'D duration 4h');
console.assert(MISSION_TIERS.C.durationHours === 8, 'C duration 8h');
console.assert(MISSION_TIERS.B.durationHours === 24, 'B duration 24h');
console.assert(MISSION_TIERS.A.durationHours === 48, 'A duration 48h');
console.assert(MAX_ACTIVE_MISSIONS === 3, 'cap 3 active missions');
console.assert(computeMissionResolvesAtHour(0, 'D') === 4, 'D from H0 → H4');
console.assert(computeMissionResolvesAtHour(10, 'B') === 34, 'B from H10 → H34');
console.assert(missionFitsInCycle(0, 'A'), 'A fits from H0');
console.assert(!missionFitsInCycle(30, 'A'), 'A does not fit from H30');
console.assert(missionFitsInCycle(68, 'D'), 'D fits from H68');
console.assert(!missionFitsInCycle(69, 'D'), 'D does not fit from H69');

console.log('missionRules OK');
