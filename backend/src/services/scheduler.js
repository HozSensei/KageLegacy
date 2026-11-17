import { processDailyRetentionTick } from './dailyRetentionJobs.js';
import { msUntilNextUtcMidnight } from './dailyUtc.js';

let midnightTimeoutId = null;
let schedulerGeneration = 0;
let running = false;

export function isSchedulerEnabled() {
  return process.env.ENABLE_SCHEDULER !== 'false';
}

export async function runCycleTickOnce() {
  const { processCycleTick } = await import('./cycleJobs.js');
  return processCycleTick();
}

export function startScheduler() {
  if (!isSchedulerEnabled()) {
    console.log('⏱  Scheduler intégré désactivé (ENABLE_SCHEDULER=false)');
    return;
  }
  if (running) return;

  running = true;
  schedulerGeneration += 1;
  scheduleUtcMidnightRetention(schedulerGeneration);

  console.log('⏱  Scheduler rétention + purge invités démarré (minuit UTC)');
}

function scheduleUtcMidnightRetention(generation) {
  if (midnightTimeoutId) {
    clearTimeout(midnightTimeoutId);
    midnightTimeoutId = null;
  }

  const delay = msUntilNextUtcMidnight();
  midnightTimeoutId = setTimeout(async () => {
    try {
      await processDailyRetentionTick();
    } catch (error) {
      console.error('[scheduler] Erreur rétention minuit UTC:', error);
    } finally {
      if (running && generation === schedulerGeneration) {
        scheduleUtcMidnightRetention(generation);
      }
    }
  }, delay);
}

export function stopScheduler() {
  if (!running) return;
  running = false;
  schedulerGeneration += 1;
  if (midnightTimeoutId) {
    clearTimeout(midnightTimeoutId);
    midnightTimeoutId = null;
  }
  console.log('⏱  Scheduler arrêté');
}
