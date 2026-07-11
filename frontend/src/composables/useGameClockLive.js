import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CYCLE_HOURS } from './useCycleProgress.js'

const HOUR_MS = 3_600_000
const SECOND_MS = 1_000

function formatLiveClock(elapsedMs) {
  const capped = Math.min(CYCLE_HOURS * HOUR_MS, Math.max(0, elapsedMs))
  const totalSeconds = Math.floor(capped / SECOND_MS)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}h${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Horloge de cycle en temps réel (ex. 16h34:12).
 * @param {import('vue').Ref<{ cycleStartAt?: string | null, hour?: number } | null>} gameClockRef
 */
export function useGameClockLive(gameClockRef) {
  const now = ref(Date.now())
  let tickTimer = null

  onMounted(() => {
    tickTimer = window.setInterval(() => {
      now.value = Date.now()
    }, SECOND_MS)
  })

  onUnmounted(() => {
    if (tickTimer) window.clearInterval(tickTimer)
  })

  const liveLabel = computed(() => {
    const clock = gameClockRef.value
    if (!clock?.cycleStartAt) {
      const hour = clock?.hour ?? 0
      return `${hour}h00:00`
    }

    const elapsed = now.value - new Date(clock.cycleStartAt).getTime()
    return formatLiveClock(elapsed)
  })

  const hour = computed(() => {
    const clock = gameClockRef.value
    if (!clock?.cycleStartAt) return clock?.hour ?? 0

    const elapsed = now.value - new Date(clock.cycleStartAt).getTime()
    return Math.min(CYCLE_HOURS, Math.floor(elapsed / HOUR_MS))
  })

  return { liveLabel, hour }
}
