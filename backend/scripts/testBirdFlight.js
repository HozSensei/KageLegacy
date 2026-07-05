/**
 * Tests unitaires Vol d'Oiseau (formules, sans BDD).
 */
import { combatStat } from '../src/services/chuninExam.js';
import {
  meetsBirdFlightRequirements,
  hasReachedTeachingPeak,
  BIRD_FLIGHT_COMBAT_REQUIRED,
  BIRD_FLIGHT_IQ_REQUIRED,
} from '../src/services/birdFlightExam.js';
import { computeBirdFlightCost } from '../src/services/gradeProgression.js';
import { computeBirdFlightRewards } from '../src/services/birdFlightService.js';

const chuninEligible = {
  grade: 'Chunin',
  taijutsu: 16,
  ninjutsu: 12,
  genjutsu: 10,
  medecine: 10,
  vitesse: 14,
  intelligence: 14,
  clan_is_noble: true,
};

const chuninOneDimensional = {
  ...chuninEligible,
  taijutsu: 18,
  intelligence: 10,
};

const chuninAtCap = {
  ...chuninEligible,
  taijutsu: 18,
  intelligence: 16,
};

console.assert(meetsBirdFlightRequirements(chuninEligible), 'eligible combat + QI');
console.assert(!meetsBirdFlightRequirements(chuninOneDimensional), 'reject combat-only spike');
console.assert(hasReachedTeachingPeak(chuninAtCap), 'peak at caps 18/16');
console.assert(!hasReachedTeachingPeak(chuninEligible), 'eligible but not at cap');

const costAtCap = 800 + (18 - BIRD_FLIGHT_COMBAT_REQUIRED) * 50 + (16 - BIRD_FLIGHT_IQ_REQUIRED) * 40;
console.assert(computeBirdFlightCost(chuninAtCap) === costAtCap, 'cost mirrors chunin exam formula');

const rewards = computeBirdFlightRewards(chuninAtCap, { clanIsNoble: true });
const statSum = 18 + 12 + 10 + 10 + 14 + 16;
console.assert(rewards.ryos === 3000 + statSum * 150, 'ryos formula');
console.assert(rewards.reputation === 15, 'rep 10 + 5 noble');

console.log('birdFlight unit tests OK', {
  combat: combatStat(chuninAtCap),
  thresholds: { BIRD_FLIGHT_COMBAT_REQUIRED, BIRD_FLIGHT_IQ_REQUIRED },
  rewards,
});
