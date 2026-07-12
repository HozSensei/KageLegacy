const AGE_COEFF = { 15: 1.5, 16: 1.0, 17: 0.7, 18: 0.4 }
const BASE_GAIN = 0.2

export const STAT_COLUMNS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medecine',
  'vitesse',
  'intelligence',
]

const FOCUS_COLUMNS = {
  Taijutsu: 'taijutsu',
  Ninjutsu: 'ninjutsu',
  Genjutsu: 'genjutsu',
  Medecine: 'medecine',
  Vitesse: 'vitesse',
  Intelligence: 'intelligence',
}

function statValue(ninja, column) {
  return Number(ninja?.[column] ?? 0)
}

function gradeCap(ninja, column) {
  return ninja?.gradeStatCaps?.[column] ?? null
}

function isAtCap(ninja, column) {
  const cap = gradeCap(ninja, column)
  return cap != null && statValue(ninja, column) >= cap
}

export function previewTrainingGain(ninja, focus) {
  if (!focus) return null

  const column = FOCUS_COLUMNS[focus]
  if (!column) return null

  if (isAtCap(ninja, column)) {
    return {
      column,
      atCap: true,
      gain: 0,
      wholePoints: 0,
      residualAfter: Number(ninja.training_residual ?? ninja.trainingResidual ?? 0),
      projectedStat: statValue(ninja, column),
      lazyRisk: ninja.character_trait === 'Faineant' || ninja.characterTrait === 'Faineant',
    }
  }

  const ageCoef = AGE_COEFF[ninja.age] ?? 1.0
  let gain = BASE_GAIN * ageCoef

  if (ninja.training_buff === 'strategy_book' || ninja.trainingBuff === 'strategy_book') {
    gain *= 1.15
  }

  const residualBefore = Number(ninja.training_residual ?? ninja.trainingResidual ?? 0)
  const residual = residualBefore + gain
  const wholePoints = Math.floor(residual)
  const residualAfter = residual - wholePoints
  const cap = gradeCap(ninja, column)
  const current = statValue(ninja, column)
  const projectedStat = cap != null ? Math.min(current + wholePoints, cap) : current + wholePoints

  return {
    column,
    atCap: false,
    gain,
    wholePoints: projectedStat - current,
    residualAfter,
    projectedStat,
    residualBefore,
    lazyRisk: ninja.character_trait === 'Faineant' || ninja.characterTrait === 'Faineant',
  }
}
