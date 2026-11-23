#!/usr/bin/env node
/** Tests du scheduler sans base de données : node scripts/testScheduler.js */
import assert from 'node:assert/strict';
import pool from '../src/config/database.js';
import { COOP_SCHEDULER_TICK_MS } from '../src/config/coopMissionConfig.js';
import { resetDailyRetentionCacheForTests } from '../src/services/dailyRetentionJobs.js';
import { msUntilNextUtcMidnight } from '../src/services/dailyUtc.js';
import { isSchedulerEnabled, startScheduler, stopScheduler } from '../src/services/scheduler.js';

const original = {
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  execute: pool.execute,
  getConnection: pool.getConnection,
  error: console.error,
  enabled: process.env.ENABLE_SCHEDULER,
};
const timers = [];
let retentionQueries = 0;
let payoutChecks = 0;

function atMidnight(timer, upperBound) {
  assert.ok(timer.delay <= upperBound && timer.delay >= msUntilNextUtcMidnight());
}

/** retention + village payout + coop maintenance */
const TIMER_COUNT = 3;

globalThis.setTimeout = (callback, delay) => {
  const timer = { callback, delay, cleared: false };
  timers.push(timer);
  return timer;
};
globalThis.clearTimeout = timer => {
  timer.cleared = true;
};
globalThis.setInterval = () => {
  throw new Error('Un intervalle legacy a été démarré');
};
pool.execute = async () => {
  retentionQueries += 1;
  return [[], []];
};
pool.getConnection = async () => ({
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
  execute: async sql => {
    if (sql.includes('FOR UPDATE')) return [[{ weekStart: '2030-01-07' }]];
    payoutChecks += 1;
    return [[{ due: 0 }]];
  },
});

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
  assert.equal(
    timers.length,
    TIMER_COUNT,
    'un seul timer par traitement après deux démarrages',
  );
  const [retention, payout, coop] = timers.splice(0);
  atMidnight(retention, delayBeforeStart);
  assert.equal(payout.delay, 0, 'rattrapage au démarrage');
  assert.equal(coop.delay, 0, 'maintenance coop au démarrage');
  await retention.callback();
  await payout.callback();
  await coop.callback();
  assert.ok(retentionQueries >= 1, 'la rétention est exécutée');
  assert.equal(payoutChecks, 1, 'le rattrapage est exécuté');
  assert.equal(timers.length, TIMER_COUNT, 'les traitements sont replanifiés');
  const rescheduledCoop = timers.find(timer => timer.delay === COOP_SCHEDULER_TICK_MS);
  assert.ok(rescheduledCoop, 'la maintenance coop est replanifiée');
  atMidnight(
    timers.find(timer => timer.delay !== COOP_SCHEDULER_TICK_MS && timer.delay !== 60_000) ||
      timers[0],
    delayBeforeStart,
  );
  stopScheduler();
  assert.ok(
    timers.splice(0).every(timer => timer.cleared),
    'arrêt de tous les timers',
  );

  resetDailyRetentionCacheForTests();
  const workingGetConnection = pool.getConnection;
  pool.execute = async () => {
    throw new Error('erreur simulée');
  };
  pool.getConnection = pool.execute;
  let errors = 0;
  console.error = () => {
    errors += 1;
  };
  startScheduler();
  const [failedRetention, failedPayout, failedCoop] = timers.splice(0);
  await failedRetention.callback();
  await failedPayout.callback();
  await failedCoop.callback();
  assert.equal(errors, 3, 'les erreurs sont signalées');
  assert.equal(timers.length, TIMER_COUNT, 'replanification après erreur');
  assert.equal(
    timers.find(timer => timer.delay === 60_000)?.delay,
    60_000,
    'le paiement est rapidement retenté',
  );
  stopScheduler();
  timers.splice(0);

  resetDailyRetentionCacheForTests();
  let finishRetentionQuery;
  let finishPayoutConnection;
  let pendingQueryCount = 0;
  pool.execute = () => {
    pendingQueryCount += 1;
    if (pendingQueryCount > 1) return Promise.resolve([[], []]);
    return new Promise(resolve => {
      finishRetentionQuery = resolve;
    });
  };
  pool.getConnection = () =>
    new Promise(resolve => {
      finishPayoutConnection = resolve;
    });
  startScheduler();
  const [pendingRetention, pendingPayout, pendingCoop] = timers.splice(0);
  const pending = Promise.all([
    pendingRetention.callback(),
    pendingPayout.callback(),
    pendingCoop.callback(),
  ]);
  stopScheduler();
  startScheduler();
  assert.equal(timers.length, TIMER_COUNT, 'un nouveau timer par traitement après redémarrage');
  finishRetentionQuery([[], []]);
  finishPayoutConnection(await workingGetConnection());
  await pending;
  assert.equal(
    timers.length,
    TIMER_COUNT,
    'un ancien traitement ne replanifie pas après redémarrage',
  );
  stopScheduler();
  assert.ok(timers.every(timer => timer.cleared));
  console.log('testScheduler: OK');
} finally {
  stopScheduler();
  globalThis.setTimeout = original.setTimeout;
  globalThis.clearTimeout = original.clearTimeout;
  globalThis.setInterval = original.setInterval;
  pool.execute = original.execute;
  pool.getConnection = original.getConnection;
  console.error = original.error;
  if (original.enabled === undefined) delete process.env.ENABLE_SCHEDULER;
  else process.env.ENABLE_SCHEDULER = original.enabled;
  await pool.end();
}
