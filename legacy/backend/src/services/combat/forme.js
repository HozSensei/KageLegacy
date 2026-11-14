import { FORME_MULTIPLIER } from './constants.js';
import { clampStat } from '../ninjaStats.js';

function moralFormeModifier(moral) {
  const value = Number(moral ?? 10);
  if (value <= 7) return 0.95;
  if (value >= 16) return 1.03;
  return 1;
}

export function getFormeMultiplier(weeklyForme, moral = 10) {
  return (FORME_MULTIPLIER[weeklyForme] ?? 1.0) * moralFormeModifier(moral);
}

export function applyFormeToStats(ninja) {
  const mult = getFormeMultiplier(ninja.weekly_forme, ninja.moral);
  const stats = {};
  for (const key of ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence']) {
    stats[key] = clampStat(Math.round(ninja[key] * mult));
  }
  return stats;
}
