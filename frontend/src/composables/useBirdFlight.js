import {
  BIRD_FLIGHT_COMBAT_REQUIRED,
  BIRD_FLIGHT_IQ_REQUIRED,
} from '../constants/birdFlight.js'

export function getBirdFlightProgress(ninja) {
  if (ninja.birdFlightProgress) return ninja.birdFlightProgress
  const combat = Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine)
  const intelligence = ninja.intelligence
  const ready = combat >= BIRD_FLIGHT_COMBAT_REQUIRED && intelligence >= BIRD_FLIGHT_IQ_REQUIRED
  return {
    combat,
    combatRequired: BIRD_FLIGHT_COMBAT_REQUIRED,
    intelligence,
    intelligenceRequired: BIRD_FLIGHT_IQ_REQUIRED,
    ready,
    combatRatio: Math.min(1, combat / BIRD_FLIGHT_COMBAT_REQUIRED),
    intelligenceRatio: Math.min(1, intelligence / BIRD_FLIGHT_IQ_REQUIRED),
  }
}

export function canRegisterBirdFlight(ninja, gameClock) {
  if (ninja.grade !== 'Chunin') return false
  if (ninja.bird_flight_requested) return false
  if (!getBirdFlightProgress(ninja).ready) return false
  const hour = gameClock?.hour ?? 0
  if (hour >= 72 || gameClock?.cycleComplete) return false
  return true
}
