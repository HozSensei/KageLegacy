export const COMBAT_REQUIRED = 10;
export const IQ_REQUIRED = 8;

export function combatStat(ninja) {
  return Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine);
}

export function meetsChuninRequirements(ninja) {
  return combatStat(ninja) >= COMBAT_REQUIRED && ninja.intelligence >= IQ_REQUIRED;
}
