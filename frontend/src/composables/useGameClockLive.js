import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CYCLE_HOURS } from './useCycleProgress.js'

const HOUR_MS = 3_600_000
const SECOND_MS = 1_000

function formatLiveClock(totalHours, subHourMs = 0) {
  const cappedHours = Math.min(CYCLE_HOURS, Math.max(0, totalHours))
  const subMs = Math.max(0, Math.min(HOUR_MS - 1, subHourMs))
  const totalSeconds = Math.floor(subMs / SECOND_MS)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${cappedHours}h${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function elapsedHoursSince(cycleStartAt, nowMs) {
  return Math.floor((nowMs - new Date(cycleStartAt).getTime()) / HOUR_MS)
}

/**
 * Horloge de cycle : heure serveur prioritaire (avance admin), sinon temps réel depuis l'ancre.
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

  const serverHour = computed(() => gameClockRef.value?.hour ?? 0)

  const liveLabel = computed(() => {
    const clock = gameClockRef.value
    if (!clock?.cycleStartAt) {
      return formatLiveClock(serverHour.value)
    }

    const elapsedMs = now.value - new Date(clock.cycleStartAt).getTime()
    const elapsedHour = elapsedHoursSince(clock.cycleStartAt, now.value)

    if (serverHour.value > elapsedHour) {
      return formatLiveClock(serverHour.value)
    }

    return formatLiveClock(elapsedHour, elapsedMs % HOUR_MS)
  })

  const hour = computed(() => {
    const clock = gameClockRef.value
    if (!clock?.cycleStartAt) return serverHour.value

    const elapsedHour = elapsedHoursSince(clock.cycleStartAt, now.value)
    return Math.min(CYCLE_HOURS, Math.max(serverHour.value, elapsedHour))
  })

  return { liveLabel, hour }
}
