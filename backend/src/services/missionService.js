import { query } from '../config/database.js';
import { getClockRow, getGameClock, isTacticsLocked } from './gameClock.js';
import { getDebtStatus } from './economyDebt.js';
import {
  evaluateMissionSuccess,
  getEligibleRanksForNinja,
  isPaidMissionRank,
  meetsRankRequirement,
  MISSION_RANKS,
  missionNetProfit,
  missionRequirementText,
  ninjaStatsFromRow,
} from './missionRules.js';
import { isNinjaListed } from './playerMarketService.js';

async function getCycleStartAt() {
  const row = await getClockRow();
  return row?.cycle_start_at;
}

function mapRankConfig() {
  return Object.entries(MISSION_RANKS).map(([rank, cfg]) => ({
    rank,
    sendCost: cfg.sendCost,
    reward: cfg.reward,
    netProfit: missionNetProfit(rank),
    requirement: missionRequirementText(rank),
    paid: Boolean(cfg.paid),
    label: cfg.label,
  }));
}

function mapNinjaForMissions(ninja) {
  const eligibleRanks = getEligibleRanksForNinja(ninja);
  return {
    id: ninja.id,
    name: ninja.name,
    grade: ninja.grade,
    eligibleRanks,
    hasCycleGear: Boolean(ninja.cycle_item_id),
    examBlocked: Boolean(ninja.chunin_exam_requested || ninja.bird_flight_requested),
    stats: ninjaStatsFromRow(ninja),
  };
}

export async function getMissionsForUser(userId) {
  const cycleStartAt = await getCycleStartAt();
  const clock = await getGameClock();
  const { ryos, salaryDebt, debtBlocksSpending } = await getDebtStatus(userId);

  const missions = cycleStartAt
    ? await query(
        `SELECT im.*, n.name AS ninja_name
         FROM idle_missions im
         JOIN ninjas n ON n.id = im.ninja_id
         WHERE im.user_id = ? AND im.cycle_start_at = ?`,
        [userId, cycleStartAt]
      )
    : [];

  const pendingCollection = missions.filter((m) => m.status === 'completed');
  const active = missions.filter((m) => m.status === 'active');
  const failed = missions.filter((m) => m.status === 'failed');

  const bench = cycleStartAt
    ? await query(
        `SELECT n.*,
                cycle_ui.id AS cycle_item_id
         FROM ninjas n
         LEFT JOIN idle_missions im ON im.ninja_id = n.id AND im.cycle_start_at = ? AND im.status IN ('active', 'completed')
         LEFT JOIN ninja_equipment ne_cycle ON ne_cycle.ninja_id = n.id AND ne_cycle.slot = 'cycle'
         LEFT JOIN user_items cycle_ui ON cycle_ui.id = ne_cycle.user_item_id
         WHERE n.user_id = ? AND n.squad_position IS NULL AND im.id IS NULL`,
        [cycleStartAt, userId]
      )
    : [];

  return {
    cycleStartAt,
    ranks: mapRankConfig(),
    activeMissions: active,
    failedMissions: failed,
    pendingCollection,
    availableNinjas: bench.map(mapNinjaForMissions),
    windowOpen: !clock.tacticsLocked,
    debtBlocksPaid: debtBlocksSpending,
    ryos,
    gameClock: clock,
  };
}

export async function assignMission(userId, ninjaId, rank) {
  const config = MISSION_RANKS[rank];
  if (!config) {
    const error = new Error('Rang de mission invalide.');
    error.statusCode = 400;
    throw error;
  }

  if (await isTacticsLocked()) {
    const error = new Error('Les missions sont fermées à partir de H71.');
    error.statusCode = 423;
    throw error;
  }

  const cycleStartAt = await getCycleStartAt();
  const ninjaRows = await query(
    `SELECT n.*, s.ryos, s.salary_debt,
            cycle_ui.id AS cycle_item_id
     FROM ninjas n
     JOIN sensei s ON s.user_id = n.user_id
     LEFT JOIN ninja_equipment ne_cycle ON ne_cycle.ninja_id = n.id AND ne_cycle.slot = 'cycle'
     LEFT JOIN user_items cycle_ui ON cycle_ui.id = ne_cycle.user_item_id
     WHERE n.id = ? AND n.user_id = ? AND n.squad_position IS NULL`,
    [ninjaId, userId]
  );
  const ninja = ninjaRows[0];
  if (!ninja) {
    const error = new Error('Ninja remplaçant introuvable.');
    error.statusCode = 404;
    throw error;
  }

  if (ninja.chunin_exam_requested) {
    const error = new Error('Ce ninja est inscrit à l\'examen Chunin et ne peut pas partir en mission.');
    error.statusCode = 409;
    throw error;
  }
  if (ninja.bird_flight_requested) {
    const error = new Error('Ce ninja est inscrit au Vol d\'Oiseau et ne peut pas partir en mission.');
    error.statusCode = 409;
    throw error;
  }
  if (ninja.cycle_item_id) {
    const error = new Error('Retirez l\'objet cycle avant d\'envoyer ce ninja en mission.');
    error.statusCode = 400;
    throw error;
  }
  if (await isNinjaListed(ninjaId)) {
    const error = new Error('Ce ninja est en vente et ne peut pas partir en mission.');
    error.statusCode = 409;
    throw error;
  }

  if (!meetsRankRequirement(rank, ninja)) {
    const error = new Error(`Prérequis non remplis pour le ${config.label} (${missionRequirementText(rank)}).`);
    error.statusCode = 400;
    throw error;
  }

  const { debtBlocksSpending } = await getDebtStatus(userId);

  const existing = await query(
    `SELECT id FROM idle_missions WHERE ninja_id = ? AND cycle_start_at = ?`,
    [ninjaId, cycleStartAt]
  );
  if (existing.length) {
    const error = new Error('Ce ninja est déjà en mission ce cycle.');
    error.statusCode = 409;
    throw error;
  }

  if (isPaidMissionRank(rank) && debtBlocksSpending) {
    const error = new Error('Dette en cours — seules les missions Rang D sont autorisées.');
    error.statusCode = 402;
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

  return {
    missionId: result.insertId,
    rank,
    reward: config.reward,
    sendCost: config.sendCost,
    netProfit: missionNetProfit(rank),
  };
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
