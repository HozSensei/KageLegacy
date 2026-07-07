#!/usr/bin/env node
/**
 * Définit l'ancre H0 du cycle (ex. « hier à midi »).
 *
 * Usage:
 *   npm run clock:set-start --prefix backend -- --at=2026-07-06T12:00:00+02:00
 *   npm run clock:set-start --prefix backend -- --at=2026-07-06T10:00:00Z
 *
 * Formats acceptés : ISO 8601 (avec fuseau recommandé).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setCycleStartAt } from '../src/services/gameClock.js';
import pool from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function parseArgs() {
  const atArg = process.argv.find((a) => a.startsWith('--at='));
  if (!atArg) {
    console.error('Usage: npm run clock:set-start -- --at=<ISO-8601>');
    process.exit(1);
  }
  return { at: atArg.slice('--at='.length) };
}

const { at } = parseArgs();

try {
  const clock = await setCycleStartAt(at);
  console.log('\n⏱  Ancre du cycle mise à jour\n');
  console.log(`  cycle_start_at : ${clock.cycleStartAt}`);
  console.log(`  Heure courante : H${clock.hour} (${clock.phase})`);
  console.log('');
} catch (error) {
  console.error('Erreur:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
