#!/usr/bin/env node
/**
 * Point d'entrée cron prod : exécute un tick de cycle (H36/H71/H72 selon l'horloge réelle).
 * Usage: npm run cycle:tick
 * Planification suggérée : toutes les minutes (systemd, k8s CronJob, etc.)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';
import { runCycleTickOnce } from '../src/services/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const result = await runCycleTickOnce();
  if (!result) {
    console.log('[cycle:tick] Horloge non initialisée — rien à faire.');
  } else if (result.action === 'cycle_reset') {
    console.log('[cycle:tick] Fin de cycle H72 — reset effectué.');
    console.log(JSON.stringify(result, null, 2));
  } else if (result.actions?.length) {
    console.log(`[cycle:tick] H${result.hour} — ${result.actions.length} action(s).`);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[cycle:tick] H${result.hour} — aucune action.`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
