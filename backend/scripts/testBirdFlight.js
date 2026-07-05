/**
 * Tests unitaires Vol d'Oiseau (formules, sans BDD).
 */
import { combatStat } from '../src/services/chuninExam.js';
import {
  computeBirdFlightCost,
  meetsBirdFlightRequirements,
  hasReachedTeachingPeak,
} from '../src/services/gradeProgression.js';
import { computeBirdFlightRewards } from '../src/services/birdFlightService.js';

const chuninPeak = {
  grade: 'Chunin',
  taijutsu: 18,
  ninjutsu: 12,
  genjutsu: 10,
  medecine: 10,
  vitesse: 14,
  intelligence: 12,
  clan_is_noble: true,
};

console.assert(meetsBirdFlightRequirements(chuninPeak), 'eligible combat >= 17');
console.assert(hasReachedTeachingPeak(chuninPeak), 'peak at cap 18');
console.assert(computeBirdFlightCost(chuninPeak) === 850, 'cost 800 + (18-17)*50');

const rewards = computeBirdFlightRewards(chuninPeak, { clanIsNoble: true });
const statSum = 18 + 12 + 10 + 10 + 14 + 12;
console.assert(rewards.ryos === 3000 + statSum * 150, 'ryos formula');
console.assert(rewards.reputation === 15, 'rep 10 + 5 noble');

console.log('birdFlight unit tests OK', { combat: combatStat(chuninPeak), rewards });
