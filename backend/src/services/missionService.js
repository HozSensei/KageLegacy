import { query } from '../config/database.js';
import { getClockRow, getGameClock, isTacticsLocked } from './gameClock.js';
import {
  getEligibleTiersForNinja,
  MISSION_TIERS,
  missionGuaranteedRyos,
  missionNetProfit,
  ninjaStatsFromRow,
} from './missionRules.js';
import { grantLootOnCollect, resolveMissionOutcome } from './missionLootService.js';
import { isNinjaListed } from './playerMarketService.js';

async function getCycleStartAt() {
  const row = await getClockRow();
  return row?.cycle_start_at;
}

function mapTierConfig() {
  return Object.values(MISSION_TIERS).map((cfg) => {
    const guaranteed = missionGuaranteedRyos(cfg.tier);
    return {
      tier: cfg.tier,
      rewardMin: guaranteed.min,
      rewardMax: guaranteed.max,
      netProfit: missionNetProfit(cfg.tier),
      requirement: cfg.requirementText,
      label: cfg.label,
      resolvesAtHour: cfg.resolvesAtHour,
      risk: {
        lightInjury: cfg.lightInjuryChance ?? 0,
        graveInjury: cfg.graveInjuryChance ?? 0,
        death: cfg.deathChance ?? 0,
      },
    };
  });
}

function parseLootResult(row) {
  if (!row?.loot_result) return null;
  return typeof row.loot_result === 'string' ? JSON.parse(row.loot_result) : row.loot_result;
}

function mapNinjaForMissions(ninja) {
  const recommendedTiers = getEligibleTiersForNinja(ninja);
  return {
    id: ninja.id,
    name: ninja.name,
    grade: ninja.grade,
    eligibleTiers: recommendedTiers,
    recommendedTiers,
    hasCycleGear: Boolean(ninja.cycle_item_id),
    examBlocked: Boolean(ninja.chunin_exam_requested || ninja.bird_flight_requested),
    stats: ninjaStatsFromRow(ninja),
  };
}

function mapMissionRow(row) {
  return {
    ...row,
    lootResult: parseLootResult(row),
  };
}

export async function getMissionsForUser(userId) {
  const cycleStartAt = await getCycleStartAt();
  const clock = await getGameClock();

  const missions = cycleStartAt
    ? await query(
        `SELECT im.*, n.name AS ninja_name
         FROM idle_missions im
         JOIN ninjas n ON n.id = im.ninja_id
         WHERE im.user_id = ? AND im.cycle_start_at = ?`,
        [userId, cycleStartAt]
      )
    : [];

  const mapped = missions.map(mapMissionRow);
  const usedTiers = new Set(mapped.map((m) => m.mission_tier));
  const pendingCollection = mapped.filter((m) => m.status === 'completed');
  const active = mapped.filter((m) => m.status === 'active');
  const failed = mapped.filter((m) => m.status === 'failed');

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
    tiers: mapTierConfig(),
    usedTiers: [...usedTiers],
    activeMissions: active,
    failedMissions: failed,
    pendingCollection,
    availableNinjas: bench.map(mapNinjaForMissions),
    windowOpen: !clock.tacticsLocked,
    gameClock: clock,
  };
}

export async function assignMission(userId, ninjaId, tier) {
  const config = MISSION_TIERS[tier];
  if (!config) {
    const error = new Error('Palier de mission invalide.');
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

  const existingNinja = await query(
    `SELECT id FROM idle_missions WHERE ninja_id = ? AND cycle_start_at = ?`,
    [ninjaId, cycleStartAt]
  );
  if (existingNinja.length) {
    const error = new Error('Ce ninja est déjà en mission ce cycle.');
    error.statusCode = 409;
    throw error;
  }

  const existingTier = await query(
    `SELECT id FROM idle_missions
     WHERE user_id = ? AND cycle_start_at = ? AND mission_tier = ?`,
    [userId, cycleStartAt, tier]
  );
  if (existingTier.length) {
    const error = new Error('Vous avez déjà un contrat actif pour ce palier de danger ce cycle.');
    error.statusCode = 409;
    throw error;
  }

  const guaranteed = missionGuaranteedRyos(tier);
  const result = await query(
    `INSERT INTO idle_missions
     (user_id, ninja_id, cycle_start_at, mission_tier, send_cost, reward_amount, resolves_at_hour)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [userId, ninjaId, cycleStartAt, tier, guaranteed.max, config.resolvesAtHour]
  );

  return {
    missionId: result.insertId,
    tier,
    resolvesAtHour: config.resolvesAtHour,
    netProfit: missionNetProfit(tier),
  };
}

export async function resolveMissionsForCycle(cycleStartAt, resolvesAtHour) {
  const missions = await query(
    `SELECT im.*, n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine, n.vitesse, n.intelligence, n.name AS ninja_name
     FROM idle_missions im
     JOIN ninjas n ON n.id = im.ninja_id
     WHERE im.cycle_start_at = ? AND im.status = 'active' AND im.resolves_at_hour = ?`,
    [cycleStartAt, resolvesAtHour]
  );

  const results = [];
  for (const mission of missions) {
    results.push(await resolveMissionOutcome(mission, mission));
  }
  return results;
}

export async function collectMissionRewards(userId) {
  const missions = await query(
    `SELECT im.*, n.id AS ninja_still_exists
     FROM idle_missions im
     LEFT JOIN ninjas n ON n.id = im.ninja_id
     WHERE im.user_id = ? AND im.status = 'completed'`,
    [userId]
  );

  if (!missions.length) return { collected: 0, totalRyos: 0, loot: [] };

  let total = 0;
  const lootReports = [];
  for (const mission of missions) {
    total += mission.reward_amount;
    const granted = await grantLootOnCollect(userId, mission);
    lootReports.push({
      missionId: mission.id,
      tier: mission.mission_tier,
      ryos: mission.reward_amount,
      injuryType: mission.injury_type,
      ...granted,
      lootResult: parseLootResult(mission),
    });
    await query(`UPDATE idle_missions SET status = 'collected' WHERE id = ?`, [mission.id]);
  }

  if (total > 0) {
    await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [total, userId]);
  }

  return { collected: missions.length, totalRyos: total, loot: lootReports };
}

export async function isNinjaOnMission(ninjaId, cycleStartAt) {
  const rows = await query(
    `SELECT id FROM idle_missions
     WHERE ninja_id = ? AND cycle_start_at = ? AND status IN ('active', 'completed')`,
    [ninjaId, cycleStartAt]
  );
  return rows.length > 0;
}
