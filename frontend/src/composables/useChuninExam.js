import { ninjaOverallRating } from '../utils/ninjaRating.js'

export const CHUNIN_AVERAGE_REQUIRED = 8
export const CHUNIN_EXAM_BASE_COST = 300
const CHUNIN_EXAM_AVERAGE_STEP = 45

export function computeChuninExamCost(ninja) {
  if (ninja.chuninExamCost != null) return ninja.chuninExamCost
  const average = ninjaOverallRating(ninja)
  const extraAverage = Math.max(0, average - CHUNIN_AVERAGE_REQUIRED) * CHUNIN_EXAM_AVERAGE_STEP
  return CHUNIN_EXAM_BASE_COST + extraAverage
}

export function getChuninExamProgress(ninja) {
  const average = ninjaOverallRating(ninja)
  return {
    average,
    averageRequired: CHUNIN_AVERAGE_REQUIRED,
    ready: average >= CHUNIN_AVERAGE_REQUIRED,
    averageRatio: Math.min(1, average / CHUNIN_AVERAGE_REQUIRED),
  }
}

export function canRegisterForExam(ninja, gameClock, sensei) {
  const hour = gameClock?.hour ?? 0
  const debtBlocked = (sensei?.ryos ?? 0) < 0 || sensei?.salaryDebt
  return (
    ninja.grade === 'Genin' &&
    !ninja.chunin_exam_requested &&
    getChuninExamProgress(ninja).ready &&
    hour < 36 &&
    !debtBlocked
  )
}
