#!/usr/bin/env node
/**
 * Commande historique du jeu d'escouade : exécute un tick de cycle H36/H71/H72.
 * Usage manuel : npm run cycle:tick
 * Ne pas planifier pour le TCG ; désactiver tout ancien cron externe.
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

main().catch(err => {
  console.error(err);
  process.exit(1);
});
