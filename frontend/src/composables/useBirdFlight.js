import { ninjaOverallRating } from '../utils/ninjaRating.js'

export const BIRD_FLIGHT_AVERAGE_REQUIRED = 14

export function getBirdFlightProgress(ninja) {
  const average = ninjaOverallRating(ninja)
  return {
    average,
    averageRequired: BIRD_FLIGHT_AVERAGE_REQUIRED,
    ready: ninja.grade === 'Chunin' && average >= BIRD_FLIGHT_AVERAGE_REQUIRED,
    averageRatio: Math.min(1, average / BIRD_FLIGHT_AVERAGE_REQUIRED),
  }
}

export function canRegisterBirdFlight(ninja, gameClock) {
  const hour = gameClock?.hour ?? 0
  return (
    ninja.grade === 'Chunin' &&
    !ninja.bird_flight_requested &&
    getBirdFlightProgress(ninja).ready &&
    hour < 72 &&
    !gameClock?.cycleComplete
  )
}
