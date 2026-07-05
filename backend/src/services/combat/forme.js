import { FORME_MULTIPLIER } from './constants.js';
import { clampStat } from '../ninjaStats.js';

export function getFormeMultiplier(weeklyForme) {
  return FORME_MULTIPLIER[weeklyForme] ?? 1.0;
}

export function applyFormeToStats(ninja) {
  const mult = getFormeMultiplier(ninja.weekly_forme);
  const stats = {};
  for (const key of ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence']) {
    stats[key] = clampStat(Math.round(ninja[key] * mult));
  }
  return stats;
}
