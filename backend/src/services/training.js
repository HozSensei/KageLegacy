import { query } from '../config/database.js';
import { clampStatToGradeCap, isStatAtGradeCap } from './gradeProgression.js';
import { getCycleEquipmentByUser } from './equipmentService.js';
import { getTrainingBoostMultiplier } from './combat/equipment.js';

export const FOCUS_VALUES = [
  'Taijutsu',
  'Ninjutsu',
  'Genjutsu',
  'Medecine',
  'Vitesse',
  'Intelligence',
];

const STAT_COLUMNS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

const AGE_COEFF = { 15: 1.5, 16: 1.0, 17: 0.7, 18: 0.4 };
const BASE_GAIN = 0.2;

export function computeTrainingCost(ninja) {
  const sum =
    ninja.taijutsu +
    ninja.ninjutsu +
    ninja.genjutsu +
    ninja.medecine +
    ninja.vitesse +
    ninja.intelligence;
  const bases = { Genin: 150, Chunin: 400, Jonin: 700 };
  const multipliers = { Genin: 5, Chunin: 8, Jonin: 12 };
  return (bases[ninja.grade] || 150) + sum * (multipliers[ninja.grade] || 5);
}

function ageCoefficient(age) {
  return AGE_COEFF[age] ?? 1.0;
}

function statColumnForFocus(focus) {
  const map = {
    Taijutsu: 'taijutsu',
    Ninjutsu: 'ninjutsu',
    Genjutsu: 'genjutsu',
    Medecine: 'medecine',
    Vitesse: 'vitesse',
    Intelligence: 'intelligence',
  };
  return map[focus];
}

export function computeTrainingGain(ninja, { cycleMultiplier = 1 } = {}) {
  const focus = ninja.training_focus;
  if (!focus) {
    return { column: null, gain: 0, skipped: true, reason: 'no_plan' };
  }

  const column = statColumnForFocus(focus);
  if (!column) return { column: null, gain: 0, skipped: true, reason: 'invalid_focus' };

  if (isStatAtGradeCap(ninja, column)) {
    return {
      column,
      gain: 0,
      skipped: true,
      reason: 'grade_cap',
      log: `${ninja.name} a atteint le plafond ${ninja.grade} en ${column} — passage de grade requis.`,
    };
  }

  const lazyChance = ninja.training_buff === 'strategy_book' ? 5 : 15;
  if (ninja.character_trait === 'Faineant' && Math.floor(Math.random() * 100) < lazyChance) {
    return {
      column,
      gain: 0,
      skipped: true,
      reason: 'lazy',
      log: `${ninja.name} a préféré dormir sous un arbre plutôt que de s'entraîner.`,
    };
  }

  let gain = BASE_GAIN * ageCoefficient(ninja.age) * cycleMultiplier;
  if (ninja.training_buff === 'strategy_book') {
    gain *= 1.15;
  }

  return { column, gain, skipped: false, clearStrategyBook: ninja.training_buff === 'strategy_book' };
}

export async function applyTrainingForUser(userId, { onlyNinjaIds = null } = {}) {
  const ninjas = await query('SELECT * FROM ninjas WHERE user_id = ?', [userId]);
  if (!ninjas.length) return { logs: [] };
  const cycleGear = await getCycleEquipmentByUser(userId);
  const cycleByNinja = cycleGear.reduce((acc, row) => {
    if (!acc[row.ninja_id]) acc[row.ninja_id] = [];
    acc[row.ninja_id].push(row);
    return acc;
  }, {});
  const logs = [];

  for (const ninja of ninjas) {
    if (onlyNinjaIds && !onlyNinjaIds.includes(ninja.id)) continue;
    if (!ninja.training_focus) continue;

    const cycleMultiplier = getTrainingBoostMultiplier(ninja, cycleByNinja[ninja.id] || []);
    const result = computeTrainingGain(ninja, { cycleMultiplier });
    if (result.skipped) {
      if (result.log) logs.push(result.log);
      continue;
    }

    const residual = Number(ninja.training_residual) + result.gain;
    const wholePoints = Math.floor(residual);
    const newResidual = residual - wholePoints;

    if (wholePoints > 0) {
      const column = result.column;
      const newValue = clampStatToGradeCap(ninja, column, ninja[column] + wholePoints);
      await query(
        `UPDATE ninjas SET ${column} = ?, training_residual = ?, training_buff = ? WHERE id = ?`,
        [newValue, newResidual, result.clearStrategyBook ? null : ninja.training_buff, ninja.id]
      );
      logs.push(`${ninja.name} : +${wholePoints} ${column} (${ninja.training_focus})`);
    } else {
      await query('UPDATE ninjas SET training_residual = ?, training_buff = ? WHERE id = ?', [
        newResidual,
        result.clearStrategyBook ? null : ninja.training_buff,
        ninja.id,
      ]);
    }
  }

  return { logs };
}


export { STAT_COLUMNS };
