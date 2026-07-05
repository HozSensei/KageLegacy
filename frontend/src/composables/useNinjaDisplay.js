import { computed } from 'vue'

export function useNinjaDisplay(ninjaRef) {
  const overall = computed(() => {
    const n = ninjaRef.value ?? ninjaRef
    if (!n) return 0
    return Math.round((n.taijutsu + n.ninjutsu + n.genjutsu + n.medecine + n.vitesse + n.intelligence) / 6)
  })

  const elementTone = computed(() => {
    const n = ninjaRef.value ?? ninjaRef
    return ({
      Katon: 'text-fire',
      Suiton: 'text-water',
      Raiton: 'text-accent',
      Doton: 'text-earth',
      Futon: 'text-accent-soft',
    })[n?.element_affinity] || 'text-ink-muted'
  })

  const joninProgress = computed(() => {
    const n = ninjaRef.value ?? ninjaRef
    if (!n) return 0
    const combat = [n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine]
    return Math.min(100, Math.round((Math.max(...combat) / 20) * 100))
  })

  const statKeys = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence']

  return { overall, elementTone, joninProgress, statKeys }
}
