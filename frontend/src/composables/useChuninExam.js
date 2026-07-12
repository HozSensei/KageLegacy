import { ninjaOverallRating } from './ninjaRating.js'

export const CHUNIN_AVERAGE_REQUIRED = 8
export const CHUNIN_PROMOTION_RYOS_MIN = 300
export const CHUNIN_PROMOTION_RYOS_MAX = 1000
export const CHUNIN_PROMOTION_RATING_CAP = 11

const ITEM_BY_RATING = {
  8: 'pansement-terrain',
  9: 'herbes-soin',
  10: 'livre-strategie',
  11: 'cachet-chakra',
}

export function computeChuninPromotionRewards(ninja) {
  const average = ninjaOverallRating(ninja)
  const minRating = CHUNIN_AVERAGE_REQUIRED
  const maxRating = CHUNIN_PROMOTION_RATING_CAP
  const clamped = Math.min(maxRating, Math.max(minRating, average))

  const ryos =
    CHUNIN_PROMOTION_RYOS_MIN +
    Math.round(((clamped - minRating) / (maxRating - minRating)) * (CHUNIN_PROMOTION_RYOS_MAX - CHUNIN_PROMOTION_RYOS_MIN))

  const reputation = Math.min(5, Math.max(1, average - (minRating - 1)))
  const itemSlug = ITEM_BY_RATING[Math.min(11, Math.max(8, average))] || ITEM_BY_RATING[8]
  const moralBoost = Math.min(5, Math.max(2, average - 6))

  return { average, ryos, reputation, itemSlug, moralBoost }
}

export function getChuninExamProgress(ninja) {
  const average = ninjaOverallRating(ninja)
  return {
    average,
    averageRequired: CHUNIN_AVERAGE_REQUIRED,
    ready: average >= CHUNIN_AVERAGE_REQUIRED,
    averageRatio: Math.min(1, average / CHUNIN_AVERAGE_REQUIRED),
    promotionRewards: average >= CHUNIN_AVERAGE_REQUIRED ? computeChuninPromotionRewards(ninja) : null,
  }
}

export function canRegisterForExam(ninja, gameClock) {
  const hour = gameClock?.hour ?? 0
  return (
    ninja.grade === 'Genin' &&
    !ninja.chunin_exam_requested &&
    getChuninExamProgress(ninja).ready &&
    hour < 72 &&
    !gameClock?.cycleComplete
  )
}
