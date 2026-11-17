#!/usr/bin/env node
/** Tests du scheduler sans base de données : node scripts/testScheduler.js */
import assert from 'node:assert/strict';
import pool from '../src/config/database.js';
import { resetDailyRetentionCacheForTests } from '../src/services/dailyRetentionJobs.js';
import { msUntilNextUtcMidnight } from '../src/services/dailyUtc.js';
import { isSchedulerEnabled, startScheduler, stopScheduler } from '../src/services/scheduler.js';

const original = {
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  execute: pool.execute,
  error: console.error,
  enabled: process.env.ENABLE_SCHEDULER,
};
const timers = [];
let queries = 0;

globalThis.setTimeout = (callback, delay) => {
  const timer = { callback, delay, cleared: false };
  timers.push(timer);
  return timer;
};
globalThis.clearTimeout = (timer) => { timer.cleared = true; };
globalThis.setInterval = () => { throw new Error('Un intervalle legacy a été démarré'); };
pool.execute = async (sql) => {
  assert.match(sql, /SELECT id FROM users/);
  queries += 1;
  return [[], []];
};

try {
  process.env.ENABLE_SCHEDULER = 'false';
  assert.equal(isSchedulerEnabled(), false);
  startScheduler();
  assert.equal(timers.length, 0, 'scheduler désactivé');

  process.env.ENABLE_SCHEDULER = 'true';
  assert.equal(isSchedulerEnabled(), true);
  const delayBeforeStart = msUntilNextUtcMidnight();
  startScheduler();
  startScheduler();
  assert.equal(timers.length, 1, 'un seul timer après deux démarrages');
  assert.ok(timers[0].delay <= delayBeforeStart && timers[0].delay >= msUntilNextUtcMidnight());

  await timers[0].callback();
  assert.equal(queries, 1, 'la rétention est exécutée');
  assert.equal(timers.length, 2, 'la rétention est replanifiée');
  stopScheduler();
  assert.equal(timers[1].cleared, true, 'arrêt du timer de rétention');

  resetDailyRetentionCacheForTests();
  pool.execute = async () => { throw new Error('erreur simulée'); };
  let errors = 0;
  console.error = () => { errors += 1; };
  startScheduler();
  await timers[2].callback();
  assert.equal(errors, 1, 'erreur de rétention signalée');
  assert.equal(timers.length, 4, 'replanification après erreur');
  stopScheduler();

  resetDailyRetentionCacheForTests();
  let finishQuery;
  pool.execute = () => new Promise((resolve) => { finishQuery = resolve; });
  startScheduler();
  const pending = timers[4].callback();
  stopScheduler();
  startScheduler();
  assert.equal(timers.length, 6, 'un nouveau timer après redémarrage');
  finishQuery([[], []]);
  await pending;
  assert.equal(timers.length, 6, 'un ancien traitement ne replanifie pas après redémarrage');
  stopScheduler();
  assert.equal(timers[5].cleared, true);
  console.log('testScheduler: OK');
} finally {
  stopScheduler();
  globalThis.setTimeout = original.setTimeout;
  globalThis.clearTimeout = original.clearTimeout;
  globalThis.setInterval = original.setInterval;
  pool.execute = original.execute;
  console.error = original.error;
  if (original.enabled === undefined) delete process.env.ENABLE_SCHEDULER;
  else process.env.ENABLE_SCHEDULER = original.enabled;
  await pool.end();
}
