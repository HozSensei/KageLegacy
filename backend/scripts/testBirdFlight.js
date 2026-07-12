/**
 * Tests unitaires Vol d'Oiseau (formules, sans BDD).
 */
import {
  meetsBirdFlightRequirements,
  hasReachedTeachingPeak,
  BIRD_FLIGHT_AVERAGE_REQUIRED,
} from '../src/services/birdFlightExam.js';
import { computeBirdFlightRewards } from '../src/services/birdFlightService.js';
import { ninjaOverallRating } from '../src/services/ninjaStats.js';

const chuninEligible = {
  grade: 'Chunin',
  taijutsu: 16,
  ninjutsu: 14,
  genjutsu: 12,
  medecine: 12,
  vitesse: 14,
  intelligence: 14,
  clan_is_noble: true,
};

const chuninOneDimensional = {
  ...chuninEligible,
  taijutsu: 18,
  ninjutsu: 10,
  genjutsu: 10,
  medecine: 10,
  vitesse: 10,
  intelligence: 10,
};

const chuninAtCap = {
  grade: 'Chunin',
  taijutsu: 18,
  ninjutsu: 18,
  genjutsu: 18,
  medecine: 18,
  vitesse: 16,
  intelligence: 16,
  clan_is_noble: true,
};

console.assert(meetsBirdFlightRequirements(chuninEligible), 'eligible average >= 14');
console.assert(!meetsBirdFlightRequirements(chuninOneDimensional), 'reject combat-only spike');
console.assert(hasReachedTeachingPeak(chuninAtCap), 'peak at average cap 17');
console.assert(!hasReachedTeachingPeak(chuninEligible), 'eligible but not at cap');

const rewards = computeBirdFlightRewards(chuninAtCap, { clanIsNoble: true });
const statSum = 18 + 18 + 18 + 18 + 16 + 16;
console.assert(rewards.ryos === 3000 + statSum * 150, 'ryos formula');
console.assert(rewards.reputation === 15, 'rep 10 + 5 noble');

console.log('birdFlight unit tests OK', {
  average: ninjaOverallRating(chuninAtCap),
  threshold: BIRD_FLIGHT_AVERAGE_REQUIRED,
  rewards,
});
