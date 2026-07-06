import { query } from '../config/database.js';
import { getClockRow, getGameClock, resetCycle, updateLastTickHour } from './gameClock.js';
import { processTrainingBillingForAllUsers } from './trainingBilling.js';
import { processChuninExamsForAllUsers } from './promotions.js';
import { generateScoutReportsForAllUsers } from './scouting.js';
import {
  applyAllPoolsMatchResults,
  simulateAllPoolsCurrentCycle,
} from './matchService.js';
import { incrementPoolCycle } from './poolService.js';
import { deductSalariesForAllUsers } from './economyService.js';
import { ensureVillageShopForAllUsers } from './villageShopService.js';
import { resolveMissionsForCycle } from './missionService.js';
import { applyStagnationForAllUsers } from './stagnation.js';
import { processAllCompletedSeasons } from './seasonService.js';
import { processBirdFlightsForAllUsers } from './birdFlightService.js';
import { ensureAcademyForAllUsers } from './academyService.js';

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

export async function runH36(cycleStartAt) {
  if (await hasJobRun(cycleStartAt, 'h36')) return { skipped: true };
  const promotions = await processChuninExamsForAllUsers();
  const scoutReports = await generateScoutReportsForAllUsers();
  await markJobRun(cycleStartAt, 'h36');
  console.log(
    `[H36] Examens Chunin : ${promotions.length} candidat(s) · Rapports espionnage : ${scoutReports.length}`
  );
  return { promotions, scoutReports };
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
  const missionResults = await resolveMissionsForCycle(cycleStartAt);
  const matchResults = await applyAllPoolsMatchResults();
  const salaries = await deductSalariesForAllUsers();
  const poolCycles = [];
  const pools = await query(`SELECT id FROM pools WHERE status = 'active'`);
  for (const pool of pools) {
    poolCycles.push(await incrementPoolCycle(pool.id));
  }
  const seasonTransitions = await processAllCompletedSeasons(poolCycles);
  const birdFlights = await processBirdFlightsForAllUsers();
  const stagnation = await applyStagnationForAllUsers();
  const training = await processTrainingBillingForAllUsers();
  await markJobRun(cycleStartAt, 'h72');
  const newClock = await resetCycle();
  await query('UPDATE sensei SET scout_env_confirmed_cycle = NULL');
  const market = await ensureVillageShopForAllUsers();
  const academy = await ensureAcademyForAllUsers(newClock.cycleStartAt);
  console.log(
    `[H72] Missions ${missionResults.length} · Vol d'Oiseau ${birdFlights.length} · stagnation ${stagnation.length} · saisons ${seasonTransitions.length} · salaires · entraînement (${training.length} joueur(s)) · magasin (${market} joueur(s)) · académie (${academy.length})`
  );
  return {
    missionResults,
    matchResults,
    salaries,
    poolCycles,
    seasonTransitions,
    birdFlights,
    stagnation,
    training,
    market,
    academy,
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
