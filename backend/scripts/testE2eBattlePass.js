#!/usr/bin/env node
/** Teste le seed Battle Pass E2E et ses refus sans base réelle. */
import assert from 'node:assert/strict';
import pool from '../src/config/database.js';
import { seedE2eBattlePass } from './lib/e2eBattlePass.js';

const original = {
  execute: pool.execute,
  getConnection: pool.getConnection,
  now: Date.now,
  dbName: process.env.DB_NAME,
  allowSeed: process.env.E2E_ALLOW_SEED,
  nodeEnv: process.env.NODE_ENV,
};
let seasons = [];
let existingQuests = [];
let failQuestInsert = false;
let getConnectionCalls = 0;
let statements = [];
let committed = false;
let rolledBack = false;
let released = false;
const connection = {
  async query(sql) {
    statements.push({ sql });
  },
  async beginTransaction() {
    statements.push({ sql: 'BEGIN' });
  },
  async commit() {
    committed = true;
  },
  async rollback() {
    rolledBack = true;
  },
  release() {
    released = true;
  },
  async execute(sql, params) {
    statements.push({ sql, params });
    if (sql.includes('FROM battle_pass_seasons')) return [seasons, []];
    if (sql.includes('FROM battle_pass_quests')) return [existingQuests, []];
    if (sql.includes('INSERT INTO battle_pass_seasons')) return [{ insertId: 7 }, []];
    if (sql.includes('INSERT INTO battle_pass_quests')) {
      if (failQuestInsert) throw new Error('insertion simulée');
      return [{}, []];
    }
    throw new Error(`Requête inattendue : ${sql}`);
  },
};

pool.execute = async sql => {
  if (sql === 'SELECT DATABASE() AS name') return [[{ name: process.env.DB_NAME }], []];
  if (sql.includes('information_schema.tables')) return [[{ name: 'e2e_fixture_guard' }], []];
  if (sql === 'SELECT marker FROM e2e_fixture_guard')
    return [[{ marker: 'kage-legacy-e2e-v1' }], []];
  throw new Error(`Requête inattendue : ${sql}`);
};
pool.getConnection = async () => {
  getConnectionCalls += 1;
  return connection;
};

function reset() {
  statements = [];
  committed = false;
  rolledBack = false;
  released = false;
}

try {
  process.env.DB_NAME = 'fixture_e2e';
  process.env.E2E_ALLOW_SEED = 'false';
  delete process.env.NODE_ENV;
  await assert.rejects(seedE2eBattlePass(), /refusée/);
  assert.equal(getConnectionCalls, 0, 'le guard précède la transaction');

  process.env.E2E_ALLOW_SEED = 'true';
  const now = new Date('2030-07-14T12:34:56.000Z');
  Date.now = () => now.getTime();
  await seedE2eBattlePass();
  assert.ok(committed && released && !rolledBack);
  const season = statements.find(entry => entry.sql.includes('INSERT INTO battle_pass_seasons'));
  assert.equal(season.params[3], '2030-06-14 00:00:00');
  assert.equal(season.params[4], '2030-10-12 00:00:00');
  const inserted = statements.filter(entry => entry.sql.includes('INSERT INTO battle_pass_quests'));
  assert.equal(inserted.length, 19);
  for (const { params } of inserted) {
    assert.ok(params[8] <= '2030-07-14 12:34:56' && params[9] >= '2030-07-14 12:34:56', params[2]);
  }
  assert.ok(inserted.some(({ params }) => params[2] === 'open_5_boosters'));

  reset();
  seasons = [{ id: 7, is_active: 1, current_window: 1 }];
  existingQuests = [{ id: 1 }];
  await seedE2eBattlePass();
  assert.ok(committed && released && !rolledBack);
  assert.ok(!statements.some(({ sql }) => /^(INSERT|UPDATE|DELETE) /.test(sql.trim())));

  reset();
  seasons = [{ id: 7, is_active: 1, current_window: 0 }];
  await assert.rejects(seedE2eBattlePass(), /hors dates/);
  assert.ok(rolledBack && released && !committed);
  assert.ok(!statements.some(({ sql }) => /^(INSERT|UPDATE|DELETE) /.test(sql.trim())));

  reset();
  seasons = [{ id: 7, is_active: 1, current_window: 1 }];
  existingQuests = [];
  await assert.rejects(seedE2eBattlePass(), /absente ou expirée/);
  assert.ok(rolledBack && released && !committed);
  assert.ok(!statements.some(({ sql }) => /^(INSERT|UPDATE|DELETE) /.test(sql.trim())));

  reset();
  seasons = [];
  failQuestInsert = true;
  await assert.rejects(seedE2eBattlePass(), /insertion simulée/);
  assert.ok(rolledBack && released && !committed, 'échec atomique');
  console.log('testE2eBattlePass: OK');
} finally {
  pool.execute = original.execute;
  pool.getConnection = original.getConnection;
  Date.now = original.now;
  for (const [key, value] of [
    ['DB_NAME', original.dbName],
    ['E2E_ALLOW_SEED', original.allowSeed],
    ['NODE_ENV', original.nodeEnv],
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await pool.end();
}
