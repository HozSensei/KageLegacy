import { processCycleTick } from './cycleJobs.js';

const TICK_MS = Number(process.env.SCHEDULER_TICK_MS || 60 * 1000);
let intervalId = null;

export function isSchedulerEnabled() {
  return process.env.ENABLE_SCHEDULER !== 'false';
}

export async function runCycleTickOnce() {
  const result = await processCycleTick();
  return result;
}

export function startScheduler() {
  if (!isSchedulerEnabled()) {
    console.log('⏱  Scheduler intégré désactivé (ENABLE_SCHEDULER=false)');
    return;
  }
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      await processCycleTick();
    } catch (error) {
      console.error('[scheduler] Erreur cycle tick:', error);
    }
  }, TICK_MS);

  console.log(`⏱  Scheduler cycle 72h démarré (tick ${TICK_MS / 1000}s)`);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('⏱  Scheduler arrêté');
  }
}
