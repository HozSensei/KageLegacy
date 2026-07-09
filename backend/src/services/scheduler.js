import { processCycleTick } from './cycleJobs.js';
import { processDailyRetentionTick } from './dailyRetentionJobs.js';
import { msUntilNextUtcMidnight } from './dailyUtc.js';

const TICK_MS = Number(process.env.SCHEDULER_TICK_MS || 60 * 1000);
let intervalId = null;
let midnightTimeoutId = null;

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

  scheduleUtcMidnightRetention();

  console.log(
    `⏱  Scheduler cycle 72h démarré (tick ${TICK_MS / 1000}s) · rétention + purge invités à minuit UTC`
  );
}

function scheduleUtcMidnightRetention() {
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
      scheduleUtcMidnightRetention();
    }
  }, delay);
}

export function stopScheduler() {
  if (midnightTimeoutId) {
    clearTimeout(midnightTimeoutId);
    midnightTimeoutId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('⏱  Scheduler arrêté');
  }
}
