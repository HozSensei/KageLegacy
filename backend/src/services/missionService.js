import { query } from '../config/database.js';
import { getClockRow } from './gameClock.js';
import { evaluateMissionSuccess, MISSION_RANKS } from './missionRules.js';

async function getCycleStartAt() {
  const row = await getClockRow();
  return row?.cycle_start_at;
}

export async function getMissionsForUser(userId) {
  const cycleStartAt = await getCycleStartAt();
  const missions = await query(
    `SELECT im.*, n.name AS ninja_name
     FROM idle_missions im
     JOIN ninjas n ON n.id = im.ninja_id
     WHERE im.user_id = ? AND im.cycle_start_at = ?`,
    [userId, cycleStartAt]
  );

  const pendingCollection = missions.filter((m) => m.status === 'completed');
  const active = missions.filter((m) => m.status === 'active');

  const bench = await query(
    `SELECT n.*
     FROM ninjas n
     LEFT JOIN idle_missions im ON im.ninja_id = n.id AND im.cycle_start_at = ? AND im.status IN ('active', 'completed')
     WHERE n.user_id = ? AND n.squad_position IS NULL AND im.id IS NULL`,
    [cycleStartAt, userId]
  );

  return {
    cycleStartAt,
    ranks: Object.entries(MISSION_RANKS).map(([rank, cfg]) => ({
      rank,
      sendCost: cfg.sendCost,
      reward: cfg.reward,
      label: cfg.label,
    })),
    activeMissions: active,
    pendingCollection,
    availableNinjas: bench,
  };
}

export async function assignMission(userId, ninjaId, rank) {
  const config = MISSION_RANKS[rank];
  if (!config) {
    const error = new Error('Rang de mission invalide.');
    error.statusCode = 400;
    throw error;
  }

  const cycleStartAt = await getCycleStartAt();
  const ninjaRows = await query(
    `SELECT n.*, s.ryos
     FROM ninjas n
     JOIN sensei s ON s.user_id = n.user_id
     WHERE n.id = ? AND n.user_id = ? AND n.squad_position IS NULL`,
    [ninjaId, userId]
  );
  const ninja = ninjaRows[0];
  if (!ninja) {
    const error = new Error('Ninja remplaçant introuvable.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await query(
    `SELECT id FROM idle_missions WHERE ninja_id = ? AND cycle_start_at = ?`,
    [ninjaId, cycleStartAt]
  );
  if (existing.length) {
    const error = new Error('Ce ninja est déjà en mission ce cycle.');
    error.statusCode = 409;
    throw error;
  }

  if (ninja.ryos < config.sendCost) {
    const error = new Error('Ryos insuffisants pour envoyer cette mission.');
    error.statusCode = 402;
    throw error;
  }

  if (config.sendCost > 0) {
    await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [config.sendCost, userId]);
  }

  const result = await query(
    `INSERT INTO idle_missions (user_id, ninja_id, cycle_start_at, mission_rank, send_cost, reward_amount)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, ninjaId, cycleStartAt, rank, config.sendCost, config.reward]
  );

  return { missionId: result.insertId, rank, reward: config.reward };
}

export async function resolveMissionsForCycle(cycleStartAt) {
  const missions = await query(
    `SELECT im.*, n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine, n.vitesse, n.intelligence
     FROM idle_missions im
     JOIN ninjas n ON n.id = im.ninja_id
     WHERE im.cycle_start_at = ? AND im.status = 'active'`,
    [cycleStartAt]
  );

  const results = [];
  for (const mission of missions) {
    const success = evaluateMissionSuccess(mission.mission_rank, mission);
    const status = success ? 'completed' : 'failed';
    await query(
      `UPDATE idle_missions SET status = ?, resolved_at = UTC_TIMESTAMP() WHERE id = ?`,
      [status, mission.id]
    );
    results.push({ missionId: mission.id, status, reward: success ? mission.reward_amount : 0 });
  }
  return results;
}

export async function collectMissionRewards(userId) {
  const missions = await query(
    `SELECT * FROM idle_missions
     WHERE user_id = ? AND status = 'completed'`,
    [userId]
  );

  if (!missions.length) return { collected: 0, totalRyos: 0 };

  let total = 0;
  for (const mission of missions) {
    total += mission.reward_amount;
    await query(`UPDATE idle_missions SET status = 'collected' WHERE id = ?`, [mission.id]);
  }

  if (total > 0) {
    await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [total, userId]);
  }

  return { collected: missions.length, totalRyos: total };
}

export async function isNinjaOnMission(ninjaId, cycleStartAt) {
  const rows = await query(
    `SELECT id FROM idle_missions
     WHERE ninja_id = ? AND cycle_start_at = ? AND status IN ('active', 'completed')`,
    [ninjaId, cycleStartAt]
  );
  return rows.length > 0;
}
