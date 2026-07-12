export const NINJA_STAT_COLUMNS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medecine',
  'vitesse',
  'intelligence',
]

export function ninjaStatSum(ninja) {
  return NINJA_STAT_COLUMNS.reduce((sum, column) => sum + (Number(ninja?.[column]) || 0), 0)
}

export function ninjaOverallAverage(ninja) {
  return ninjaStatSum(ninja) / NINJA_STAT_COLUMNS.length
}

export function ninjaOverallRating(ninja) {
  return Math.round(ninjaOverallAverage(ninja))
}
