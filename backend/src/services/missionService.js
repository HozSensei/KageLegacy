import { query } from '../config/database.js';
import { getClockRow, getGameClock, isTacticsLocked } from './gameClock.js';
import {
  computeMissionOdds,
  computeMissionOddsForTier,
  computeMissionResolvesAtHour,
  getEligibleTiersForNinja,
  getRecommendedTiersForNinja,
  MAX_ACTIVE_MISSIONS,
  MISSION_CYCLE_END_HOUR,
  MISSION_TIERS,
  MISSION_TIER_ORDER,
  missionFitsInCycle,
  missionGuaranteedRyos,
  missionNetProfit,
  ninjaStatsFromRow,
  normalizeMissionTier,
} from './missionRules.js';
import { grantLootOnCollect, resolveMissionOutcome } from './missionLootService.js';
import { getMissionMoralGain } from './dispensaryService.js';
import { isNinjaListed } from './playerMarketService.js';
import { recordEliteQuestEvent } from './eliteSeasonPassService.js';
import { ninjaOverallRating } from './ninjaStats.js';
import { recordVillageScore } from './villageService.js';

async function getCycleStartAt() {
  const row = await getClockRow();
  return row?.cycle_start_at;
}

function mapTierConfig(currentHour = 0) {
  return MISSION_TIER_ORDER.map((tier) => {
    const cfg = MISSION_TIERS[tier];
    const guaranteed = missionGuaranteedRyos(tier);
    const fitsInCycle = missionFitsInCycle(currentHour, cfg);
    return {
      tier: cfg.tier,
      rank: cfg.rank,
      targetRating: cfg.targetRating,
      rewardMin: guaranteed.min,
      rewardMax: guaranteed.max,
      netProfit: missionNetProfit(tier),
      durationHours: cfg.durationHours,
      resolvesAtHour: computeMissionResolvesAtHour(currentHour, cfg),
      fitsInCycle,
      statGainOnSuccess: cfg.statGainOnSuccess,
      benchStatGainBonus: cfg.benchStatGainBonus,
    };
  });
}

function parseLootResult(row) {
  if (!row?.loot_result) return null;
  return typeof row.loot_result === 'string' ? JSON.parse(row.loot_result) : row.loot_result;
}

function mapNinjaForMissions(ninja) {
  const oddsByTier = computeMissionOdds(ninja);
  const recommendedTiers = getRecommendedTiersForNinja(ninja);
  return {
    id: ninja.id,
    name: ninja.name,
    grade: ninja.grade,
    element_affinity: ninja.element_affinity,
    preparation_type: ninja.preparation_type,
    training_focus: ninja.preparation_type,
    overallRating: ninjaOverallRating(ninja),
    eligibleTiers: getEligibleTiersForNinja(ninja),
    recommendedTiers,
    oddsByTier,
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
  const currentHour = clock.hour ?? 0;

  const [activeRows, pendingRows, failedRows] = cycleStartAt
    ? await Promise.all([
        query(
          `SELECT im.*, n.name AS ninja_name
           FROM idle_missions im
           JOIN ninjas n ON n.id = im.ninja_id
           WHERE im.user_id = ? AND im.cycle_start_at = ? AND im.status = 'active'`,
          [userId, cycleStartAt],
        ),
        query(
          `SELECT im.*, n.name AS ninja_name
           FROM idle_missions im
           JOIN ninjas n ON n.id = im.ninja_id
           WHERE im.user_id = ? AND im.status = 'completed'`,
          [userId],
        ),
        query(
          `SELECT im.*, n.name AS ninja_name
           FROM idle_missions im
           JOIN ninjas n ON n.id = im.ninja_id
           WHERE im.user_id = ? AND im.cycle_start_at = ? AND im.status = 'failed'`,
          [userId, cycleStartAt],
        ),
      ])
    : [[], [], []];

  const activeMissions = activeRows.map(mapMissionRow);
  const pendingCollection = pendingRows.map(mapMissionRow);
  const failedMissions = failedRows.map(mapMissionRow);
  const activeCount = activeMissions.length;
  const slotsRemaining = Math.max(0, MAX_ACTIVE_MISSIONS - activeCount);

  const bench = await query(
    `SELECT n.*
     FROM ninjas n
     LEFT JOIN idle_missions im ON im.ninja_id = n.id AND im.status = 'active'
     WHERE n.user_id = ? AND n.squad_position IS NULL AND im.id IS NULL`,
    [userId],
  );

  return {
    cycleStartAt,
    tiers: mapTierConfig(currentHour),
    maxActiveMissions: MAX_ACTIVE_MISSIONS,
    activeCount,
    slotsRemaining,
    activeMissions,
    failedMissions,
    pendingCollection,
    availableNinjas: bench.map(mapNinjaForMissions),
    windowOpen: !clock.tacticsLocked,
    gameClock: clock,
  };
}

export async function assignMission(userId, ninjaId, tier) {
  const normalizedTier = normalizeMissionTier(tier);
  const config = normalizedTier ? MISSION_TIERS[normalizedTier] : null;
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
  const clock = await getGameClock();
  const currentHour = clock.hour ?? 0;
  const resolvesAtHour = computeMissionResolvesAtHour(currentHour, config);

  if (!missionFitsInCycle(currentHour, config)) {
    const error = new Error(
      `Pas assez de temps dans ce cycle pour une mission rang ${normalizedTier} (${config.durationHours} h). Envoyez plus tôt ou choisissez un rang plus court.`,
    );
    error.statusCode = 409;
    throw error;
  }

  const ninjaRows = await query(
    `SELECT n.*, s.ryos, s.salary_debt
     FROM ninjas n
     JOIN sensei s ON s.user_id = n.user_id
     WHERE n.id = ? AND n.user_id = ? AND n.squad_position IS NULL`,
    [ninjaId, userId],
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
  if (await isNinjaListed(ninjaId)) {
    const error = new Error('Ce ninja est en vente et ne peut pas partir en mission.');
    error.statusCode = 409;
    throw error;
  }

  const existingNinja = await query(
    'SELECT id FROM idle_missions WHERE ninja_id = ? AND status = \'active\'',
    [ninjaId],
  );
  if (existingNinja.length) {
    const error = new Error('Ce ninja est déjà en mission.');
    error.statusCode = 409;
    throw error;
  }

  const activeCountRows = await query(
    'SELECT COUNT(*) AS c FROM idle_missions WHERE user_id = ? AND status = \'active\'',
    [userId],
  );
  const activeCount = Number(activeCountRows[0]?.c ?? 0);
  if (activeCount >= MAX_ACTIVE_MISSIONS) {
    const error = new Error(
      `Cap atteint : ${MAX_ACTIVE_MISSIONS} ninjas maximum en mission en même temps.`,
    );
    error.statusCode = 409;
    throw error;
  }

  const odds = computeMissionOddsForTier(ninja, normalizedTier);
  const guaranteed = missionGuaranteedRyos(normalizedTier);
  const result = await query(
    `INSERT INTO idle_missions
     (user_id, ninja_id, cycle_start_at, mission_tier, send_cost, reward_amount, resolves_at_hour)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [userId, ninjaId, cycleStartAt, normalizedTier, guaranteed.max, resolvesAtHour],
  );

  await query('UPDATE sensei SET onboarding_mission_done = 1 WHERE user_id = ?', [userId]);
  await recordVillageScore(userId, 'mission_assign');

  return {
    missionId: result.insertId,
    tier: normalizedTier,
    odds,
    durationHours: config.durationHours,
    resolvesAtHour,
    netProfit: missionNetProfit(normalizedTier),
  };
}

/**
 * Résout les missions actives dont l'heure de retour est atteinte (≤ currentHour).
 * À H72, résout aussi tout le reste encore actif (filet de sécurité fin de cycle).
 */
export async function resolveDueMissions(cycleStartAt, currentHour) {
  if (!cycleStartAt) return [];

  const hour = Number(currentHour) || 0;
  const forceAll = hour >= MISSION_CYCLE_END_HOUR;
  const missions = forceAll
    ? await query(
        `SELECT im.*, n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine, n.vitesse, n.intelligence,
                n.squad_position, n.grade, n.name AS ninja_name
         FROM idle_missions im
         JOIN ninjas n ON n.id = im.ninja_id
         WHERE im.cycle_start_at = ? AND im.status = 'active'`,
        [cycleStartAt],
      )
    : await query(
        `SELECT im.*, n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine, n.vitesse, n.intelligence,
                n.squad_position, n.grade, n.name AS ninja_name
         FROM idle_missions im
         JOIN ninjas n ON n.id = im.ninja_id
         WHERE im.cycle_start_at = ? AND im.status = 'active' AND im.resolves_at_hour <= ?`,
        [cycleStartAt, hour],
      );

  const results = [];
  for (const mission of missions) {
    results.push(await resolveMissionOutcome(mission, mission));
  }
  return results;
}

/** @deprecated Préférer resolveDueMissions — conservé pour compat scripts/tests. */
export async function resolveMissionsForCycle(cycleStartAt, resolvesAtHour) {
  return resolveDueMissions(cycleStartAt, resolvesAtHour);
}

export async function collectMissionRewards(userId) {
  const missions = await query(
    `SELECT im.*, n.id AS ninja_still_exists, im.ninja_id
     FROM idle_missions im
     LEFT JOIN ninjas n ON n.id = im.ninja_id
     WHERE im.user_id = ? AND im.status = 'completed'`,
    [userId],
  );

  if (!missions.length) return { collected: 0, totalRyos: 0, loot: [] };

  let total = 0;
  const lootReports = [];
  for (const mission of missions) {
    total += mission.reward_amount;
    const granted = await grantLootOnCollect(userId, mission);
    if (mission.ninja_still_exists && mission.ninja_id) {
      const moralGain = getMissionMoralGain(mission.mission_tier);
      if (moralGain > 0) {
        await query('UPDATE ninjas SET moral = LEAST(20, moral + ?) WHERE id = ?', [
          moralGain,
          mission.ninja_id,
        ]);
      }
    }
    lootReports.push({
      missionId: mission.id,
      tier: mission.mission_tier,
      ryos: mission.reward_amount,
      injuryType: mission.injury_type,
      ...granted,
      lootResult: parseLootResult(mission),
    });
    await query('UPDATE idle_missions SET status = \'collected\' WHERE id = ?', [mission.id]);
  }

  if (total > 0) {
    await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [total, userId]);
  }

  if (missions.length > 0) {
    await recordEliteQuestEvent(userId, 'mission_collected', missions.length);
  }

  return { collected: missions.length, totalRyos: total, loot: lootReports };
}

export async function isNinjaOnMission(ninjaId) {
  const rows = await query(
    `SELECT id FROM idle_missions
     WHERE ninja_id = ? AND status = 'active'`,
    [ninjaId],
  );
  return rows.length > 0;
}
