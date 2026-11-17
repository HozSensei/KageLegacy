#!/usr/bin/env node
/** Teste le garde-fou E2E sans connexion à une base réelle. */
import assert from 'node:assert/strict';
import pool from '../src/config/database.js';
import { assertE2eDatabase } from './lib/e2eGuard.js';

const original = {
  execute: pool.execute,
  dbName: process.env.DB_NAME,
  allowSeed: process.env.E2E_ALLOW_SEED,
  nodeEnv: process.env.NODE_ENV,
};
let tables = [];
let markerRows = [];
const statements = [];
pool.execute = async (sql, params) => {
  statements.push(sql);
  if (sql === 'SELECT DATABASE() AS name') return [[{ name: process.env.DB_NAME }], []];
  if (sql.includes('information_schema.tables')) return [tables.map((name) => ({ name })), []];
  if (sql.startsWith('CREATE TABLE e2e_fixture_guard')) {
    tables.push('e2e_fixture_guard');
    return [{}, []];
  }
  if (sql.startsWith('INSERT INTO e2e_fixture_guard')) {
    markerRows.push({ marker: params[0] });
    return [{}, []];
  }
  if (sql === 'SELECT marker FROM e2e_fixture_guard') return [markerRows, []];
  throw new Error(`Requête inattendue : ${sql}`);
};

try {
  process.env.DB_NAME = 'fixture_e2e';
  process.env.E2E_ALLOW_SEED = 'false';
  delete process.env.NODE_ENV;
  await assert.rejects(assertE2eDatabase({ initialize: true }), /refusée/);
  process.env.E2E_ALLOW_SEED = 'true';
  process.env.NODE_ENV = 'production';
  await assert.rejects(assertE2eDatabase({ initialize: true }), /refusée/);
  delete process.env.NODE_ENV;
  process.env.DB_NAME = 'fixture';
  await assert.rejects(assertE2eDatabase({ initialize: true }), /refusée/);
  assert.equal(statements.length, 0, 'aucune requête lorsque la configuration est refusée');

  process.env.DB_NAME = 'fixture_e2e';
  tables = ['users'];
  await assert.rejects(assertE2eDatabase({ initialize: true }), /refusée/);
  assert.ok(!statements.some((sql) => sql.startsWith('CREATE TABLE')));
  tables = [];
  await assert.rejects(assertE2eDatabase(), /refusée/);
  await assertE2eDatabase({ initialize: true });
  assert.deepEqual(tables, ['e2e_fixture_guard']);
  assert.deepEqual(markerRows, [{ marker: 'kage-legacy-e2e-v1' }]);
  await assertE2eDatabase();
  markerRows = [{ marker: 'incorrect' }];
  await assert.rejects(assertE2eDatabase(), /invalide/);
  console.log('testE2eGuard: OK');
} finally {
  pool.execute = original.execute;
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
