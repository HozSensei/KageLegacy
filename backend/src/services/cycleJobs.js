import { query } from '../config/database.js';
import { getClockRow, getGameClock, resetCycle, updateLastTickHour } from './gameClock.js';
import { processTrainingBillingForAllUsers } from './trainingBilling.js';
import { processChuninExamsForAllUsers } from './promotions.js';
import { generateTendenciesIntelForAllUsers } from './scoutIntelService.js';
import { generateRosterIntelForAllUsers } from './scouting.js';
import {
  applyAllPoolsMatchResults,
  simulateAllPoolsCurrentCycle,
} from './matchService.js';
import { incrementPoolCycle } from './poolService.js';
import { deductSalariesForAllUsers } from './economyService.js';
import { ensureVillageShopForAllUsers } from './villageShopService.js';
import { resolveMissionsForCycle } from './missionService.js';
import { decrementFormeLocksForAllUsers } from './missionLootService.js';
import { applyStagnationForAllUsers } from './stagnation.js';
import { processAllCompletedSeasons } from './seasonService.js';
import { processBirdFlightsForAllUsers } from './birdFlightService.js';
import { resolveReconnaissanceAtH36 } from './reconnaissanceService.js';
import { createCycleCloseNotificationsForAllUsers } from './cycleCloseNotifications.js';

async function hasJobRun(cycleStartAt, jobName) {
  const rows = await query(
    'SELECT id FROM cycle_job_runs WHERE cycle_start_at = ? AND job_name = ?',
    [cycleStartAt, jobName]
  );
  return rows.length > 0;
}

async function markJobRun(cycleStartAt, jobName) {
  await query(
    'INSERT IGNORE INTO cycle_job_runs (cycle_start_at, job_name) VALUES (?, ?)',
    [cycleStartAt, jobName]
  );
}

/** Réinitialise les jobs de cycle à partir d'une heure cible (outil admin / dev). */
export async function resetCycleJobsFromHour(cycleStartAt, hour) {
  if (!cycleStartAt) return;
  const jobs = [];
  if (hour <= 36) jobs.push('h36');
  if (hour <= 54) jobs.push('h54');
  if (hour <= 71) jobs.push('h71');
  if (hour <= 72) jobs.push('h72');
  for (const jobName of jobs) {
    await query('DELETE FROM cycle_job_runs WHERE cycle_start_at = ? AND job_name = ?', [
      cycleStartAt,
      jobName,
    ]);
  }
}

export async function runH36(cycleStartAt) {
  if (await hasJobRun(cycleStartAt, 'h36')) return { skipped: true };
  const reconMissions = await resolveReconnaissanceAtH36(cycleStartAt);
  const tendencies = await generateTendenciesIntelForAllUsers();
  await markJobRun(cycleStartAt, 'h36');
  console.log(
    `[H36] Reconnaissance : ${reconMissions.length} mission(s) · Tendances espionnage : ${tendencies.length}`
  );
  return { reconMissions, tendencies };
}

export async function runH54(cycleStartAt) {
  if (await hasJobRun(cycleStartAt, 'h54')) return { skipped: true };
  const rosterReports = await generateRosterIntelForAllUsers();
  await markJobRun(cycleStartAt, 'h54');
  console.log(`[H54] Gel compo · Rapports espionnage figés : ${rosterReports.length}`);
  return { rosterReports };
}

export async function runH71(cycleStartAt) {
  if (await hasJobRun(cycleStartAt, 'h71')) return { skipped: true };
  const simulations = await simulateAllPoolsCurrentCycle();
  await markJobRun(cycleStartAt, 'h71');
  console.log(`[H71] Simulation — ${simulations.length} pool(s)`);
  return { simulations };
}

export async function runH72(cycleStartAt) {
  if (await hasJobRun(cycleStartAt, 'h72')) return { skipped: true };
  const missionResults = await resolveMissionsForCycle(cycleStartAt, 72);
  const matchResults = await applyAllPoolsMatchResults();
  const salaries = await deductSalariesForAllUsers();
  await decrementFormeLocksForAllUsers();
  const poolCycles = [];
  const pools = await query(`SELECT id FROM pools WHERE status = 'active'`);
  for (const pool of pools) {
    poolCycles.push(await incrementPoolCycle(pool.id));
  }
  const seasonTransitions = await processAllCompletedSeasons(poolCycles);
  const chuninExams = await processChuninExamsForAllUsers();
  const birdFlights = await processBirdFlightsForAllUsers();
  const stagnation = await applyStagnationForAllUsers();
  const training = await processTrainingBillingForAllUsers();
  await createCycleCloseNotificationsForAllUsers(salaries);
  await markJobRun(cycleStartAt, 'h72');
  await resetCycle();
  const newRow = await getClockRow();
  await query('UPDATE sensei SET scout_env_confirmed_cycle = NULL');
  const market = await ensureVillageShopForAllUsers();
  console.log(
    `[H72] Missions ${missionResults.length} · Examens Chunin ${chuninExams.length} · Vol d'Oiseau ${birdFlights.length} · stagnation ${stagnation.length} · saisons ${seasonTransitions.length} · salaires · entraînement (${training.length} joueur(s)) · magasin (${market} joueur(s))`
  );
  return {
    missionResults,
    matchResults,
    salaries,
    poolCycles,
    seasonTransitions,
    chuninExams,
    birdFlights,
    stagnation,
    training,
    market,
  };
}

export async function processCycleTick() {
  const row = await getClockRow();
  if (!row?.cycle_start_at) return null;

  const clock = await getGameClock();
  const cycleStartAt = row.cycle_start_at;
  const hour = clock.hour;
  const actions = [];

  if (hour >= 36 && !(await hasJobRun(cycleStartAt, 'h36'))) {
    actions.push(await runH36(cycleStartAt));
  }

  if (hour >= 54 && !(await hasJobRun(cycleStartAt, 'h54'))) {
    actions.push(await runH54(cycleStartAt));
  }

  if (hour >= 71 && !(await hasJobRun(cycleStartAt, 'h71'))) {
    actions.push(await runH71(cycleStartAt));
  }

  if (clock.cycleComplete || hour >= 72) {
    actions.push(await runH72(cycleStartAt));
    await updateLastTickHour(0);
    return { hour: 0, action: 'cycle_reset', actions };
  }

  if (hour !== row.last_tick_hour) {
    await updateLastTickHour(hour);
  }

  return actions.length ? { hour, actions } : { hour, action: 'none' };
}
