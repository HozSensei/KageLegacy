export const CHUNIN_EXAM_COST = 300;
export const COMBAT_REQUIRED = 10;
export const IQ_REQUIRED = 8;

export function combatStat(ninja) {
  return Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine);
}

export function meetsChuninRequirements(ninja) {
  return combatStat(ninja) >= COMBAT_REQUIRED && ninja.intelligence >= IQ_REQUIRED;
}

export function getChuninExamProgress(ninja) {
  const combat = combatStat(ninja);
  const intelligence = ninja.intelligence;
  return {
    combat,
    combatRequired: COMBAT_REQUIRED,
    intelligence,
    intelligenceRequired: IQ_REQUIRED,
    ready: meetsChuninRequirements(ninja),
    combatRatio: Math.min(1, combat / COMBAT_REQUIRED),
    intelligenceRatio: Math.min(1, intelligence / IQ_REQUIRED),
  };
}
