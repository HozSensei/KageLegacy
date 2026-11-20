import { settleWeeklyVillageRewards } from './asyncDuelWeeklyRewards.js';
import { processDailyRetentionTick } from './dailyRetentionJobs.js';
import { msUntilNextUtcMidnight, nextUtcMidnightDate } from './dailyUtc.js';

const PAYOUT_RETRY_MS = 60_000;
let midnightTimeoutId = null;
let payoutTimeoutId = null;
let schedulerGeneration = 0;
let running = false;

export function isSchedulerEnabled() {
  return process.env.ENABLE_SCHEDULER !== 'false';
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
  scheduleVillagePayout(schedulerGeneration, 0);

  console.log('⏱  Scheduler rétention, purge invités et récompenses village démarré (minuit UTC)');
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

function scheduleVillagePayout(generation, delay) {
  payoutTimeoutId = setTimeout(async () => {
    // If this tick spans midnight, check again rather than skip the new day.
    const nextCheckAt = nextUtcMidnightDate().getTime();
    let retry = false;
    try {
      await settleWeeklyVillageRewards();
    } catch (error) {
      retry = true;
      console.error('[scheduler] Erreur récompenses village:', error);
    } finally {
      if (running && generation === schedulerGeneration) {
        const delay = retry ? PAYOUT_RETRY_MS : Math.max(0, nextCheckAt - Date.now());
        scheduleVillagePayout(generation, delay);
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
  if (payoutTimeoutId) {
    clearTimeout(payoutTimeoutId);
    payoutTimeoutId = null;
  }
  console.log('⏱  Scheduler arrêté');
}
