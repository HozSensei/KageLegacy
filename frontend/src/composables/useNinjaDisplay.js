import { computed } from 'vue'

const FORME_BAR_WIDTH = {
  Lamentable: 25,
  Passable: 50,
  Excellent: 75,
  Divin: 100,
}

export function useNinjaDisplay(ninjaRef) {
  const ninja = computed(() => ninjaRef.value ?? ninjaRef)

  const overall = computed(() => {
    const n = ninja.value
    if (!n) return 0
    return Math.round((n.taijutsu + n.ninjutsu + n.genjutsu + n.medecine + n.vitesse + n.intelligence) / 6)
  })

  const elementTone = computed(() => {
    const n = ninja.value
    return ({
      Katon: 'text-fire',
      Suiton: 'text-water',
      Raiton: 'text-accent',
      Doton: 'text-earth',
      Futon: 'text-accent-soft',
    })[n?.element_affinity] || 'text-ink-muted'
  })

  const joninProgress = computed(() => {
    const n = ninja.value
    if (!n) return 0
    const combat = [n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine]
    return Math.min(100, Math.round((Math.max(...combat) / 20) * 100))
  })

  const profile = computed(() => ninja.value?.profile ?? null)

  const artLabel = computed(() => profile.value?.artLabel ?? '')
  const potentialLabel = computed(() => profile.value?.potentialLabel ?? '')
  const clanTierLabel = computed(() => profile.value?.clanTierLabel ?? '')
  const potential = computed(() => profile.value?.potential ?? 'ordinaire')
  const clanTier = computed(() => profile.value?.clanTier ?? 'roturier')
  const isNobleBloodline = computed(() => Boolean(profile.value?.isNobleBloodline))

  const potentialClass = computed(() => ({
    prodige: 'text-accent',
    prometteur: 'text-accent-soft',
    ordinaire: 'text-ink-faint',
  })[potential.value] || 'text-ink-faint')

  const clanTierClass = computed(() => ({
    noble: 'text-accent border-accent/40',
    common: 'text-ink-muted border-line',
    roturier: 'text-ink-faint border-line/80',
  })[clanTier.value] || 'text-ink-faint')

  const statKeys = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence']

  const formeBarWidth = computed(() => {
    const forme = ninja.value?.weekly_forme
    return FORME_BAR_WIDTH[forme] ?? 50
  })

  return {
    overall,
    elementTone,
    joninProgress,
    statKeys,
    formeBarWidth,
    profile,
    artLabel,
    potentialLabel,
    clanTierLabel,
    potential,
    clanTier,
    isNobleBloodline,
    potentialClass,
    clanTierClass,
  }
}
