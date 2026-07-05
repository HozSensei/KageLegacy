const COMBAT_REQUIRED = 10
const IQ_REQUIRED = 8
export const CHUNIN_EXAM_COST = 300

export function combatStat(ninja) {
  return Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine)
}

export function getChuninExamProgress(ninja) {
  const combat = combatStat(ninja)
  const intelligence = ninja.intelligence
  return {
    combat,
    combatRequired: COMBAT_REQUIRED,
    intelligence,
    intelligenceRequired: IQ_REQUIRED,
    ready: combat >= COMBAT_REQUIRED && intelligence >= IQ_REQUIRED,
    combatRatio: Math.min(1, combat / COMBAT_REQUIRED),
    intelligenceRatio: Math.min(1, intelligence / IQ_REQUIRED),
  }
}

export function canRegisterForExam(ninja, gameClock) {
  const hour = gameClock?.hour ?? 0
  return (
    ninja.grade === 'Genin' &&
    !ninja.chunin_exam_requested &&
    getChuninExamProgress(ninja).ready &&
    hour < 36
  )
}
