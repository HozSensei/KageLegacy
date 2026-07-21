import { query } from '../config/database.js';
import { clampStatToGradeCap, isStatAtGradeCap } from './gradeProgression.js';
import { inferPotential } from './ninjaProfile.js';

export const TRAINING_TYPE_VALUES = [
  'Chakra',
  'Physique',
  'Medical',
  'Genjutsu',
  'Ninjutsu',
  'Equilibre',
];

/** @deprecated Utiliser TRAINING_TYPE_VALUES */
export const FOCUS_VALUES = TRAINING_TYPE_VALUES;

export const STAT_COLUMNS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medecine',
  'vitesse',
  'intelligence',
];

export const TRAINING_TYPES = {
  Chakra: {
    stats: ['intelligence', 'ninjutsu', 'genjutsu'],
    weights: [0.35, 0.35, 0.3],
  },
  Physique: {
    stats: ['taijutsu', 'vitesse', 'medecine'],
    weights: [0.4, 0.35, 0.25],
  },
  Medical: {
    stats: ['medecine', 'intelligence', 'vitesse'],
    weights: [0.4, 0.35, 0.25],
  },
  Genjutsu: {
    stats: ['genjutsu', 'intelligence', 'vitesse'],
    weights: [0.4, 0.35, 0.25],
  },
  Ninjutsu: {
    stats: ['ninjutsu', 'intelligence', 'taijutsu'],
    weights: [0.4, 0.35, 0.25],
  },
  Equilibre: {
    stats: ['taijutsu', 'ninjutsu', 'genjutsu'],
    weights: [0.35, 0.35, 0.3],
  },
};

/**
 * Calibré juil. 2026 — Genin→Chunin (prep + global alignés, âge 16, rotation types) :
 * ordinaire ~5 · prometteur ~3 · prodige ~2 cycles.
 * Écart potentiel volontairement large (talent = vitesse).
 */
export const PREP_COEF = 3.2;
export const GLOBAL_COEF = 1.6;
const PREP_RNG = [0.75, 1.25];
const GLOBAL_RNG = [0.85, 1.15];
export const POTENTIAL_MULT = { ordinaire: 1, prometteur: 1.5, prodige: 2.2 };
const FOCUS_STAT_BOOST = 1.5;
const AGE_COEFF = { 15: 1.5, 16: 1.0, 17: 0.7, 18: 0.4 };

export function computeTrainingCost(ninja) {
  const sum =
    ninja.taijutsu +
    ninja.ninjutsu +
    ninja.genjutsu +
    ninja.medecine +
    ninja.vitesse +
    ninja.intelligence;
  const bases = { Genin: 220, Chunin: 550, Jonin: 950 };
  const multipliers = { Genin: 7, Chunin: 11, Jonin: 16 };
  return (bases[ninja.grade] || 220) + sum * (multipliers[ninja.grade] || 7);
}

function ageCoefficient(age) {
  return AGE_COEFF[age] ?? 1.0;
}

export function rollTrainingMultiplier(mode, rng = Math.random) {
  const [min, max] = mode === 'preparation' ? PREP_RNG : GLOBAL_RNG;
  return min + rng() * (max - min);
}

export function getPotentialMultiplier(potential) {
  return POTENTIAL_MULT[potential] ?? 1;
}

function resolvePotential(ninja) {
  if (ninja.potential) return ninja.potential;
  return inferPotential(
    {
      taijutsu: ninja.taijutsu,
      ninjutsu: ninja.ninjutsu,
      genjutsu: ninja.genjutsu,
      medecine: ninja.medecine,
      vitesse: ninja.vitesse,
      intelligence: ninja.intelligence,
    },
    ninja.grade
  );
}

export function getTrainingBuffMultiplier(ninja) {
  if (ninja.training_buff === 'strategy_book') return 1.15;
  if (ninja.training_buff === 'training_weights') return 1.2;
  return 1;
}

export function computeTrainingPart(coef, mode, ninja, { rngMultiplier = null } = {}) {
  const mult = rngMultiplier ?? rollTrainingMultiplier(mode);
  const potentialMult = getPotentialMultiplier(resolvePotential(ninja));
  const ageMult = ageCoefficient(ninja.age);
  const buffMult = getTrainingBuffMultiplier(ninja);
  return coef * mult * potentialMult * ageMult * buffMult;
}

export function getTrainingGainRange(coef, mode, ninja) {
  const [minRng, maxRng] = mode === 'preparation' ? PREP_RNG : GLOBAL_RNG;
  const potentialMult = getPotentialMultiplier(resolvePotential(ninja));
  const ageMult = ageCoefficient(ninja.age);
  const buffMult = getTrainingBuffMultiplier(ninja);
  const base = coef * potentialMult * ageMult * buffMult;
  return { min: base * minRng, max: base * maxRng, avg: base };
}

export function distributePart(part, trainingType, ninja, mode, { rng = Math.random } = {}) {
  const config = TRAINING_TYPES[trainingType];
  if (!config) return { gains: [], allCapped: true, focusStat: null };

  const uncapped = config.stats.filter((stat) => !isStatAtGradeCap(ninja, stat));
  if (!uncapped.length) {
    return { gains: [], allCapped: true, focusStat: null };
  }

  let weights = config.stats.map((stat, index) =>
    isStatAtGradeCap(ninja, stat) ? 0 : config.weights[index]
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    return { gains: [], allCapped: true, focusStat: null };
  }
  weights = weights.map((weight) => weight / weightSum);

  let focusIdx = -1;
  if (mode === 'preparation' && uncapped.length > 0) {
    const focusStat = uncapped[Math.floor(rng() * uncapped.length)];
    focusIdx = config.stats.indexOf(focusStat);
  }

  const gains = [];
  for (let index = 0; index < config.stats.length; index += 1) {
    const stat = config.stats[index];
    if (isStatAtGradeCap(ninja, stat)) continue;
    let share = part * weights[index];
    if (index === focusIdx) share *= FOCUS_STAT_BOOST;
    if (share > 0) gains.push({ column: stat, gain: share });
  }

  return {
    gains,
    allCapped: false,
    focusStat: focusIdx >= 0 ? config.stats[focusIdx] : null,
  };
}

export function parseStatResiduals(ninja) {
  if (ninja.stat_residuals) {
    if (typeof ninja.stat_residuals === 'string') {
      try {
        return JSON.parse(ninja.stat_residuals);
      } catch {
        return {};
      }
    }
    return { ...ninja.stat_residuals };
  }
  if (Number(ninja.training_residual) > 0 && ninja.preparation_type) {
    const config = TRAINING_TYPES[ninja.preparation_type];
    const firstStat = config?.stats?.[0];
    if (firstStat) {
      return { [firstStat]: Number(ninja.training_residual) };
    }
  }
  return {};
}

export function computeTrainingSession(ninja, trainingType, mode, options = {}) {
  if (!trainingType) {
    return { skipped: true, reason: 'no_plan', gains: [], logs: [] };
  }

  const coef = mode === 'preparation' ? PREP_COEF : GLOBAL_COEF;
  const part = computeTrainingPart(coef, mode, ninja, options);
  const distribution = distributePart(part, trainingType, ninja, mode, options);

  if (distribution.allCapped) {
    return {
      skipped: true,
      reason: 'grade_cap',
      gains: [],
      logs: [
        `${ninja.name} a atteint les plafonds ${ninja.grade} pour ${trainingType} — passage de grade requis.`,
      ],
    };
  }

  if (!distribution.gains.length) {
    return { skipped: true, reason: 'no_gain', gains: [], logs: [] };
  }

  const modeLabel = mode === 'preparation' ? 'préparation' : 'entraînement global';
  const gainSummary = distribution.gains
    .map(({ column, gain }) => `${column} +${gain.toFixed(2)}`)
    .join(', ');
  const logs = [`${ninja.name} (${modeLabel} ${trainingType}) : ${gainSummary}`];
  if (distribution.focusStat) {
    logs.push(`${ninja.name} brille particulièrement en ${distribution.focusStat} ce cycle.`);
  }

  return {
    skipped: false,
    gains: distribution.gains,
    focusStat: distribution.focusStat,
    clearTrainingBuff:
      (mode === 'preparation' && ninja.training_buff === 'strategy_book') ||
      ninja.training_buff === 'training_weights',
    logs,
  };
}

async function applyGainsToNinja(ninja, session) {
  const residuals = parseStatResiduals(ninja);
  const statUpdates = {};
  const appliedLogs = [];
  const appliedGains = [];

  for (const { column, gain } of session.gains) {
    const residual = (Number(residuals[column]) || 0) + gain;
    const wholePoints = Math.floor(residual);
    residuals[column] = residual - wholePoints;

    if (wholePoints > 0) {
      const current = Number(ninja[column]) || 0;
      const newValue = clampStatToGradeCap(ninja, column, current + wholePoints);
      statUpdates[column] = newValue;
      ninja[column] = newValue;
      if (newValue > current) {
        appliedGains.push({ stat: column, delta: newValue - current });
        appliedLogs.push(`${ninja.name} : +${newValue - current} ${column}`);
      }
    }
  }

  const setClauses = [];
  const values = [];
  for (const [column, value] of Object.entries(statUpdates)) {
    setClauses.push(`${column} = ?`);
    values.push(value);
  }
  setClauses.push('stat_residuals = ?');
  values.push(JSON.stringify(residuals));

  if (session.clearTrainingBuff) {
    setClauses.push('training_buff = ?');
    values.push(null);
  }

  values.push(ninja.id);
  await query(`UPDATE ninjas SET ${setClauses.join(', ')} WHERE id = ?`, values);

  return {
    appliedGains,
    sessionGains: session.gains.map(({ column, gain }) => ({ stat: column, amount: gain })),
    logs: appliedLogs.length ? appliedLogs : session.logs.filter((line) => line.includes(':')),
  };
}

export async function applyTrainingForUser(
  userId,
  { mode = 'preparation', onlyNinjaIds = null, globalTrainingType = null } = {}
) {
  const ninjas = await query('SELECT * FROM ninjas WHERE user_id = ?', [userId]);
  if (!ninjas.length) return { logs: [], sessions: [] };

  const logs = [];
  const sessions = [];

  for (const ninja of ninjas) {
    if (onlyNinjaIds && !onlyNinjaIds.includes(ninja.id)) continue;

    let trainingType = null;
    if (mode === 'preparation') {
      if (!ninja.squad_position || !ninja.preparation_type) continue;
      trainingType = ninja.preparation_type;
    } else if (mode === 'global') {
      if (!globalTrainingType) continue;
      trainingType = globalTrainingType;
    } else {
      continue;
    }

    const session = computeTrainingSession(ninja, trainingType, mode);

    if (session.skipped) {
      sessions.push({
        ninjaId: ninja.id,
        name: ninja.name,
        grade: ninja.grade,
        mode,
        trainingType,
        skipped: true,
        skipReason: session.reason,
        appliedGains: [],
        sessionGains: [],
        focusStat: null,
      });
      logs.push(...session.logs);
      continue;
    }

    const { appliedGains, sessionGains, logs: appliedLogs } = await applyGainsToNinja(ninja, session);
    sessions.push({
      ninjaId: ninja.id,
      name: ninja.name,
      grade: ninja.grade,
      mode,
      trainingType,
      skipped: false,
      skipReason: null,
      appliedGains,
      sessionGains,
      focusStat: session.focusStat,
    });
    logs.push(...appliedLogs);
  }

  return { logs, sessions };
}

export function previewTrainingSession(ninja, trainingType, mode) {
  if (!trainingType) return null;

  const coef = mode === 'preparation' ? PREP_COEF : GLOBAL_COEF;
  const range = getTrainingGainRange(coef, mode, ninja);
  const config = TRAINING_TYPES[trainingType];
  if (!config) return null;

  const statPreviews = config.stats.map((column) => {
    const atCap = isStatAtGradeCap(ninja, column);
    const weight = config.weights[config.stats.indexOf(column)] ?? 0;
    const residuals = parseStatResiduals(ninja);
    const residualBefore = Number(residuals[column]) || 0;

    if (atCap) {
      return { column, atCap: true, minGain: 0, maxGain: 0, weight };
    }

    const minGain = range.min * weight;
    const maxGain = range.max * weight * (mode === 'preparation' ? FOCUS_STAT_BOOST : 1);
    const avgGain = range.avg * weight;

    return {
      column,
      atCap: false,
      minGain,
      maxGain,
      avgGain,
      weight,
      residualBefore,
    };
  });

  const allCapped = statPreviews.every((preview) => preview.atCap);

  return {
    trainingType,
    mode,
    allCapped,
    statPreviews,
  };
}
