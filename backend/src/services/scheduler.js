import { processCycleTick } from './cycleJobs.js';

const TICK_MS = 60 * 1000;
let intervalId = null;

export function startScheduler() {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      await processCycleTick();
    } catch (error) {
      console.error('[scheduler] Erreur cycle tick:', error);
    }
  }, TICK_MS);

  console.log('⏱  Scheduler cycle 72h démarré (tick 60s)');
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
