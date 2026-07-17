/**
 * Objectifs de cycle — 1–2 missions de saison affichées au Bureau.
 */

import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { meetsChuninRequirements } from './chuninExam.js';

const OBJECTIVE_DEFS = {
  win_league: { target: 1, reward: 200 },
  missions_c_plus: { target: 2, reward: 180 },
  promote_genin: { target: 1, reward: 250 },
  recon_complete: { target: 1, reward: 150 },
};

function pickObjectivesForUser({ hasEligibleGenin, seasonCycle }) {
  const keys = ['win_league', 'missions_c_plus'];
  if (hasEligibleGenin) keys.push('promote_genin');
  else keys.push('recon_complete');
  // Alternate secondary objective by cycle parity
  if (seasonCycle % 2 === 0 && keys.includes('promote_genin')) {
    return ['win_league', 'promote_genin'];
  }
  if (seasonCycle % 2 === 1) {
    return ['win_league', keys.includes('missions_c_plus') ? 'missions_c_plus' : 'recon_complete'];
  }
  return keys.slice(0, 2);
}

export async function ensureCycleObjectives(userId) {
  const pool = await findUserPool(userId);
  if (!pool) return [];

  const existing = await query(
    `SELECT * FROM sensei_cycle_objectives
     WHERE user_id = ? AND pool_id = ? AND season_cycle = ?`,
    [userId, pool.id, pool.current_cycle]
  );
  if (existing.length) return existing;

  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND grade = 'Genin'`,
    [userId]
  );
  const hasEligibleGenin = ninjas.some((n) => meetsChuninRequirements(n));
  const keys = pickObjectivesForUser({
    hasEligibleGenin,
    seasonCycle: pool.current_cycle,
  });

  for (const key of keys) {
    const def = OBJECTIVE_DEFS[key];
    await query(
      `INSERT IGNORE INTO sensei_cycle_objectives
       (user_id, pool_id, season_cycle, objective_key, target_value, reward_ryos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, pool.id, pool.current_cycle, key, def.target, def.reward]
    );
  }

  return query(
    `SELECT * FROM sensei_cycle_objectives
     WHERE user_id = ? AND pool_id = ? AND season_cycle = ?`,
    [userId, pool.id, pool.current_cycle]
  );
}

export async function getCycleObjectivesPayload(userId, locale = 'fr') {
  const rows = await ensureCycleObjectives(userId);
  const lang = locale === 'en' ? 'en' : 'fr';

  const labels = {
    fr: {
      win_league: 'Gagner le match de ligue',
      missions_c_plus: 'Réussir 2 missions rang C ou plus',
      promote_genin: 'Faire passer un Genin à l\'examen Chunin',
      recon_complete: 'Terminer une mission de reconnaissance',
    },
    en: {
      win_league: 'Win the league match',
      missions_c_plus: 'Succeed at 2 rank C+ missions',
      promote_genin: 'Promote a Genin via Chunin exam',
      recon_complete: 'Complete a reconnaissance mission',
    },
  };

  return {
    objectives: rows.map((row) => ({
      key: row.objective_key,
      label: labels[lang][row.objective_key] || row.objective_key,
      target: row.target_value,
      progress: row.progress_value,
      status: row.status,
      rewardRyos: row.reward_ryos,
      completed: row.status === 'completed',
    })),
  };
}

async function bumpObjective(userId, objectiveKey, amount = 1) {
  const pool = await findUserPool(userId);
  if (!pool) return null;

  await ensureCycleObjectives(userId);

  const rows = await query(
    `SELECT * FROM sensei_cycle_objectives
     WHERE user_id = ? AND pool_id = ? AND season_cycle = ? AND objective_key = ? AND status = 'active'`,
    [userId, pool.id, pool.current_cycle, objectiveKey]
  );
  const row = rows[0];
  if (!row) return null;

  const progress = Math.min(row.target_value, row.progress_value + amount);
  const completed = progress >= row.target_value;
  await query(
    `UPDATE sensei_cycle_objectives
     SET progress_value = ?, status = ?, completed_at = IF(?, UTC_TIMESTAMP(), completed_at)
     WHERE id = ?`,
    [progress, completed ? 'completed' : 'active', completed ? 1 : 0, row.id]
  );

  if (completed) {
    await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [
      row.reward_ryos,
      userId,
    ]);
    await createSenseiNotification(userId, 'cycle_objective', {
      objectiveKey,
      rewardRyos: row.reward_ryos,
      seasonCycle: pool.current_cycle,
    });
  }

  return { objectiveKey, progress, completed, rewardRyos: row.reward_ryos };
}

export async function recordCycleObjectiveEvent(userId, event) {
  switch (event) {
    case 'league_win':
      return bumpObjective(userId, 'win_league', 1);
    case 'mission_c_plus_success':
      return bumpObjective(userId, 'missions_c_plus', 1);
    case 'chunin_promote':
      return bumpObjective(userId, 'promote_genin', 1);
    case 'recon_complete':
      return bumpObjective(userId, 'recon_complete', 1);
    default:
      return null;
  }
}

export async function expireCycleObjectivesForPool(poolId, seasonCycle) {
  await query(
    `UPDATE sensei_cycle_objectives
     SET status = 'expired'
     WHERE pool_id = ? AND season_cycle = ? AND status = 'active'`,
    [poolId, seasonCycle]
  );
}
