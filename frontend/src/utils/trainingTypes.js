export const STAT_COLUMNS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medecine',
  'vitesse',
  'intelligence',
];

export const TRAINING_TYPE_VALUES = [
  'Chakra',
  'Physique',
  'Medical',
  'Genjutsu',
  'Ninjutsu',
  'Equilibre',
];

export const TRAINING_TYPES = {
  Chakra: {
    stats: ['intelligence', 'ninjutsu', 'genjutsu'],
    weights: [0.35, 0.35, 0.3],
  },
  Physique: {
    stats: ['taijutsu', 'vitesse'],
    weights: [0.55, 0.45],
  },
  Medical: {
    stats: ['medecine', 'intelligence'],
    weights: [0.55, 0.45],
  },
  Genjutsu: {
    stats: ['genjutsu', 'intelligence'],
    weights: [0.55, 0.45],
  },
  Ninjutsu: {
    stats: ['ninjutsu', 'intelligence'],
    weights: [0.55, 0.45],
  },
  Equilibre: {
    stats: STAT_COLUMNS,
    weights: STAT_COLUMNS.map(() => 1 / 6),
  },
};

export const PREP_COEF = 0.4;
export const GLOBAL_COEF = 0.2;

const PREP_RNG = [0.75, 1.25];
const GLOBAL_RNG = [0.85, 1.15];
const POTENTIAL_MULT = { ordinaire: 1, prometteur: 1.1, prodige: 1.25 };
const AGE_COEFF = { 15: 1.5, 16: 1.0, 17: 0.7, 18: 0.4 };

function ageCoefficient(age) {
  return AGE_COEFF[age] ?? 1.0;
}

function getPotentialMultiplier(potential) {
  return POTENTIAL_MULT[potential] ?? 1;
}

export function parseStatResiduals(ninja) {
  const raw = ninja?.stat_residuals ?? ninja?.statResiduals;
  if (raw) {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return { ...raw };
  }
  return {};
}

export function getTrainingGainRange(coef, mode, ninja) {
  const [minRng, maxRng] = mode === 'preparation' ? PREP_RNG : GLOBAL_RNG;
  const potential = ninja?.potential ?? 'ordinaire';
  const potentialMult = getPotentialMultiplier(potential);
  const ageMult = ageCoefficient(ninja?.age);
  let buffMult = 1;
  if (ninja?.training_buff === 'strategy_book' || ninja?.trainingBuff === 'strategy_book') {
    buffMult = 1.15;
  }
  const base = coef * potentialMult * ageMult * buffMult;
  return { min: base * minRng, max: base * maxRng, avg: base };
}
