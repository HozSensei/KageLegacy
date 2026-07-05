import { query } from '../config/database.js';
import { clampStatToGradeCap, isStatAtGradeCap } from './gradeProgression.js';

const STAT_COLUMNS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

const AGE_COEFF = { 15: 1.5, 16: 1.0, 17: 0.7, 18: 0.4 };
const BASE_GAIN = 0.2;

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

export function computeTrainingGain(ninja, sensei) {
  const column = statColumnForFocus(sensei.training_focus);
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

  if (ninja.character_trait === 'Faineant' && Math.floor(Math.random() * 100) < 15) {
    return {
      column,
      gain: 0,
      skipped: true,
      reason: 'lazy',
      log: `${ninja.name} a préféré dormir sous un arbre plutôt que de s'entraîner.`,
    };
  }

  let gain = BASE_GAIN * ageCoefficient(ninja.age);
  if (sensei.training_focus === sensei.specialty) {
    gain *= 1.15;
  }

  return { column, gain, skipped: false };
}

export async function applyTrainingForUser(userId) {
  const senseiRows = await query('SELECT * FROM sensei WHERE user_id = ?', [userId]);
  const sensei = senseiRows[0];
  if (!sensei) return { logs: [] };

  const ninjas = await query('SELECT * FROM ninjas WHERE user_id = ?', [userId]);
  const logs = [];

  for (const ninja of ninjas) {
    const result = computeTrainingGain(ninja, sensei);
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
      await query(`UPDATE ninjas SET ${column} = ?, training_residual = ? WHERE id = ?`, [
        newValue,
        newResidual,
        ninja.id,
      ]);
      logs.push(`${ninja.name} : +${wholePoints} ${column} (focus ${sensei.training_focus})`);
    } else {
      await query('UPDATE ninjas SET training_residual = ? WHERE id = ?', [newResidual, ninja.id]);
    }
  }

  return { logs };
}

export async function applyTrainingForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const allLogs = [];
  for (const user of users) {
    const { logs } = await applyTrainingForUser(user.id);
    allLogs.push(...logs);
  }
  return allLogs;
}

export { STAT_COLUMNS };
