#!/usr/bin/env node
/**
 * Applique CYCLE_START_AT depuis l'environnement (déploiement Docker).
 * À utiliser avec CYCLE_START_AT_APPLY=true pour un réancrage explicite.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setCycleStartAt } from '../src/services/gameClock.js';
import pool from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const at = process.env.CYCLE_START_AT?.trim();
const apply = process.env.CYCLE_START_AT_APPLY === 'true';

if (!at || !apply) {
  await pool.end();
  process.exit(0);
}

try {
  const clock = await setCycleStartAt(at);
  console.log(`⏱  CYCLE_START_AT appliqué → H${clock.hour} (ancre ${clock.cycleStartAt})`);
} catch (error) {
  console.error('⏱  CYCLE_START_AT ignoré:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
