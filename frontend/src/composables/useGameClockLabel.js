import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const PHASE_KEYS = {
  training: 'gameClock.phases.training',
  mid_cycle: 'gameClock.phases.mid_cycle',
  operation_live: 'gameClock.phases.operation_live',
  cycle_end: 'gameClock.phases.cycle_end',
}

/**
 * Libellé horloge de jeu pour l'en-tête (H{n} · phase).
 * @param {import('vue').Ref<{ hour?: number, phase?: string } | null>} gameClockRef
 */
export function useGameClockLabel(gameClockRef) {
  const { t } = useI18n()

  return computed(() => {
    const clock = gameClockRef.value
    const hour = clock?.hour ?? 0
    const phaseKey = PHASE_KEYS[clock?.phase]
    const phase = phaseKey ? t(phaseKey) : '…'
    return t('gameClock.label', { hour, phase })
  })
}
