export function computeBirdFlightCost(ninja) {
  if (ninja.birdFlightCost != null) return ninja.birdFlightCost
  const combat = Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine)
  return 800 + Math.max(0, combat - 17) * 50
}

export function canRegisterBirdFlight(ninja, gameClock) {
  if (ninja.grade !== 'Chunin') return false
  if (ninja.bird_flight_requested) return false
  if (!ninja.birdFlightReady) return false
  const hour = gameClock?.hour ?? 0
  if (hour >= 72 || gameClock?.cycleComplete) return false
  return true
}

export function getBirdFlightCombat(ninja) {
  return Math.max(ninja.taijutsu, ninja.ninjutsu, ninja.genjutsu, ninja.medecine)
}
