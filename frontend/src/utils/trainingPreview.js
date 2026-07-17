import {
  PREP_COEF,
  GLOBAL_COEF,
  TRAINING_TYPES,
  getTrainingGainRange,
  parseStatResiduals,
} from './trainingTypes.js';

export { STAT_COLUMNS, TRAINING_TYPE_VALUES, TRAINING_TYPES } from './trainingTypes.js';

function statValue(ninja, column) {
  return Number(ninja?.[column] ?? 0);
}

function gradeCap(ninja, column) {
  return ninja?.gradeStatCaps?.[column] ?? null;
}

function isAtCap(ninja, column) {
  const cap = gradeCap(ninja, column);
  return cap != null && statValue(ninja, column) >= cap;
}

export function previewTrainingSession(ninja, trainingType, mode) {
  if (!trainingType) return null;

  const config = TRAINING_TYPES[trainingType];
  if (!config) return null;

  const coef = mode === 'preparation' ? PREP_COEF : GLOBAL_COEF;
  const range = getTrainingGainRange(coef, mode, ninja);

  const statPreviews = config.stats.map((column) => {
    const atCap = isAtCap(ninja, column);
    const weight = config.weights[config.stats.indexOf(column)] ?? 0;
    const residuals = parseStatResiduals(ninja);
    const residualBefore = Number(residuals[column]) || 0;

    if (atCap) {
      return { column, atCap: true, minGain: 0, maxGain: 0, avgGain: 0, weight, residualBefore };
    }

    const focusBoost = mode === 'preparation' ? 1.5 : 1;
    return {
      column,
      atCap: false,
      minGain: range.min * weight,
      maxGain: range.max * weight * focusBoost,
      avgGain: range.avg * weight,
      weight,
      residualBefore,
    };
  });

  return {
    trainingType,
    mode,
    allCapped: statPreviews.every((preview) => preview.atCap),
    statPreviews,
    lazyRisk: false,
  };
}

export function combinePreviews(prepPreview, globalPreview) {
  if (!prepPreview && !globalPreview) return null;
  if (!prepPreview) return globalPreview;
  if (!globalPreview) return prepPreview;

  const columns = new Set([
    ...prepPreview.statPreviews.map((preview) => preview.column),
    ...globalPreview.statPreviews.map((preview) => preview.column),
  ]);

  const statPreviews = [...columns].map((column) => {
    const prep = prepPreview.statPreviews.find((preview) => preview.column === column);
    const global = globalPreview.statPreviews.find((preview) => preview.column === column);
    if (!prep && !global) return null;
    if (!prep) return global;
    if (!global) return prep;

    return {
      column,
      atCap: prep.atCap && global.atCap,
      minGain: prep.minGain + global.minGain,
      maxGain: prep.maxGain + global.maxGain,
      avgGain: prep.avgGain + global.avgGain,
      weight: prep.weight,
      residualBefore: prep.residualBefore,
    };
  }).filter(Boolean);

  return {
    trainingType: prepPreview.trainingType,
    globalTrainingType: globalPreview.trainingType,
    mode: 'combined',
    allCapped: statPreviews.every((preview) => preview.atCap),
    statPreviews,
    lazyRisk: prepPreview.lazyRisk || globalPreview.lazyRisk,
  };
}
