import { computed, onMounted, onUnmounted, ref } from 'vue'

export const CYCLE_HOURS = 72
const HOUR_MS = 3_600_000

export const CYCLE_MILESTONES = [
  {
    id: 'start',
    hour: 0,
    shortKey: 'cycleProgress.milestones.start.short',
    titleKey: 'cycleProgress.milestones.start.title',
    eventKeys: [
      'cycleProgress.events.start.training',
      'cycleProgress.events.start.missions',
      'cycleProgress.events.start.shop',
      'cycleProgress.events.start.academy',
      'cycleProgress.events.start.chunin',
      'cycleProgress.events.start.reconnaissance',
    ],
  },
  {
    id: 'mid',
    hour: 36,
    shortKey: 'cycleProgress.milestones.mid.short',
    titleKey: 'cycleProgress.milestones.mid.title',
    eventKeys: [
      'cycleProgress.events.mid.scoutTendencies',
      'cycleProgress.events.mid.management',
      'cycleProgress.events.mid.chuninRegistration',
      'cycleProgress.events.mid.birdFlight',
    ],
  },
  {
    id: 'freeze',
    hour: 54,
    shortKey: 'cycleProgress.milestones.freeze.short',
    titleKey: 'cycleProgress.milestones.freeze.title',
    eventKeys: [
      'cycleProgress.events.freeze.composition',
      'cycleProgress.events.freeze.training',
      'cycleProgress.events.freeze.scoutRoster',
      'cycleProgress.events.freeze.tactics',
    ],
  },
  {
    id: 'operation',
    hour: 71,
    shortKey: 'cycleProgress.milestones.operation.short',
    titleKey: 'cycleProgress.milestones.operation.title',
    eventKeys: [
      'cycleProgress.events.operation.lock',
      'cycleProgress.events.operation.simulation',
      'cycleProgress.events.operation.chronicle',
    ],
  },
  {
    id: 'end',
    hour: 72,
    shortKey: 'cycleProgress.milestones.end.short',
    titleKey: 'cycleProgress.milestones.end.title',
    eventKeys: [
      'cycleProgress.events.end.missions',
      'cycleProgress.events.end.match',
      'cycleProgress.events.end.salaries',
      'cycleProgress.events.end.chunin',
      'cycleProgress.events.end.training',
      'cycleProgress.events.end.birdFlight',
      'cycleProgress.events.end.stagnation',
      'cycleProgress.events.end.reset',
    ],
  },
]

function milestoneStatus(milestone, hour, cycleComplete) {
  if (milestone.id === 'end') {
    if (cycleComplete || hour >= CYCLE_HOURS) return 'done'
    if (hour >= 71) return 'current'
    return 'upcoming'
  }

  const next = CYCLE_MILESTONES.find((m) => m.hour > milestone.hour)
  const endHour = next?.hour ?? CYCLE_HOURS

  if (hour >= endHour) return 'done'
  if (hour >= milestone.hour) return 'current'
  return 'upcoming'
}

function hoursUntil(hour, target) {
  return Math.max(0, target - hour)
}

/**
 * Progression du cycle ninja (0–72 h) pour la barre d'en-tête.
 * @param {import('vue').Ref<{
 *   hour?: number,
 *   phase?: string,
 *   cycleStartAt?: string | null,
 *   cycleComplete?: boolean,
 *   tacticsLocked?: boolean,
 * } | null>} gameClockRef
 */
export function useCycleProgress(gameClockRef) {
  const now = ref(Date.now())
  let tickTimer = null

  onMounted(() => {
    tickTimer = window.setInterval(() => {
      now.value = Date.now()
    }, 1_000)
  })

  onUnmounted(() => {
    if (tickTimer) window.clearInterval(tickTimer)
  })

  const hour = computed(() => gameClockRef.value?.hour ?? 0)

  const percent = computed(() => {
    const clock = gameClockRef.value
    if (!clock) return 0

    const serverHour = clock.hour ?? 0

    if (clock.cycleStartAt) {
      const elapsed = now.value - new Date(clock.cycleStartAt).getTime()
      const elapsedHour = Math.floor(elapsed / HOUR_MS)

      if (serverHour > elapsedHour) {
        return Math.min(100, (serverHour / CYCLE_HOURS) * 100)
      }

      return Math.min(100, (elapsed / (CYCLE_HOURS * HOUR_MS)) * 100)
    }

    return Math.min(100, (serverHour / CYCLE_HOURS) * 100)
  })

  const milestones = computed(() => {
    const h = hour.value
    const cycleComplete = Boolean(gameClockRef.value?.cycleComplete)

    return CYCLE_MILESTONES.map((milestone) => {
      const status = milestoneStatus(milestone, h, cycleComplete)
      return {
        ...milestone,
        status,
        position: (milestone.hour / CYCLE_HOURS) * 100,
        hoursUntil: status === 'upcoming' ? hoursUntil(h, milestone.hour) : 0,
      }
    })
  })

  const currentMilestone = computed(() =>
    milestones.value.find((m) => m.status === 'current') ?? milestones.value.at(-1)
  )

  return {
    hour,
    percent,
    milestones,
    currentMilestone,
    phase: computed(() => gameClockRef.value?.phase ?? 'training'),
    cycleComplete: computed(() => Boolean(gameClockRef.value?.cycleComplete)),
  }
}
