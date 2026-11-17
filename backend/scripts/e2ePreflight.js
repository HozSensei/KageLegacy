#!/usr/bin/env node
/** Réserve une base vide aux fixtures E2E avant toute migration ou seed. */
import pool from '../src/config/database.js';
import { assertE2eDatabase } from './lib/e2eGuard.js';

try {
  await assertE2eDatabase({ initialize: true });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
