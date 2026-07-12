import { computed } from 'vue'
import { getChuninExamProgress } from './useChuninExam.js'
import { getBirdFlightProgress } from './useBirdFlight.js'
import { ninjaOverallRating } from '../utils/ninjaRating.js'

const FORME_BAR_WIDTH = {
  Lamentable: 25,
  Passable: 50,
  Excellent: 75,
  Divin: 100,
}

export function useNinjaDisplay(ninjaRef) {
  const ninja = computed(() => ninjaRef.value ?? ninjaRef)

  const overall = computed(() => ninjaOverallRating(ninja.value))

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
    if (!n || n.grade !== 'Chunin') return 0
    const progress = n.birdFlightProgress ?? getBirdFlightProgress(n)
    return Math.round((progress.averageRatio ?? 0) * 100)
  })

  const gradeProgress = computed(() => {
    const n = ninja.value
    if (!n) return { show: false, labelKey: '', percent: 0 }

    if (n.grade === 'Genin') {
      const exam = getChuninExamProgress(n)
      return {
        show: true,
        labelKey: 'ninja.chuninProgress',
        percent: Math.round((exam.averageRatio ?? 0) * 100),
      }
    }

    if (n.grade === 'Chunin') {
      return {
        show: true,
        labelKey: 'ninja.joninProgress',
        percent: joninProgress.value,
      }
    }

    return { show: false, labelKey: '', percent: 0 }
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

  const elementLabel = computed(() => {
    const affinity = ninja.value?.element_affinity
    return affinity ? `elements.${affinity}` : ''
  })

  const gradeLabel = computed(() => {
    const grade = ninja.value?.grade
    return grade ? `grades.${grade}` : ''
  })

  const preparationType = computed(
    () =>
      ninja.value?.preparationType ??
      ninja.value?.preparation_type ??
      ninja.value?.trainingFocus ??
      ninja.value?.training_focus ??
      null
  )

  const trainingFocus = preparationType

  const trainingFocusLabel = computed(() => {
    const type = preparationType.value
    return type ? `training.types.${type}` : ''
  })

  return {
    overall,
    elementTone,
    elementLabel,
    gradeLabel,
    trainingFocus,
    trainingFocusLabel,
    joninProgress,
    gradeProgress,
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
