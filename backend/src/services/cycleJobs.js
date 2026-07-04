import { query } from '../config/database.js';
import { getClockRow, getGameClock, resetCycle, updateLastTickHour } from './gameClock.js';
import { applyTrainingForAllUsers } from './training.js';
import { processChuninExamsForAllUsers } from './promotions.js';

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
  await markJobRun(cycleStartAt, 'h36');
  console.log(`[H36] Examens Chunin : ${promotions.length} candidat(s) traité(s)`);
  return { promotions };
}

export async function runH71(cycleStartAt) {
  if (await hasJobRun(cycleStartAt, 'h71')) return { skipped: true };
  await markJobRun(cycleStartAt, 'h71');
  // TODO Milestone 5/6 : simulation combat + génération chronique
  console.log('[H71] Gel des tactiques — simulation & chronique (à brancher M5/M6)');
  return { frozen: true };
}

export async function runH72(cycleStartAt) {
  if (await hasJobRun(cycleStartAt, 'h72')) return { skipped: true };
  const trainingLogs = await applyTrainingForAllUsers();
  await markJobRun(cycleStartAt, 'h72');
  await resetCycle();
  console.log(`[H72] Fin de cycle — entraînement appliqué (${trainingLogs.length} log(s)), nouveau cycle`);
  return { trainingLogs };
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
