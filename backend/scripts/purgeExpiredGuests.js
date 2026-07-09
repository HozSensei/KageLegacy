#!/usr/bin/env node
/**
 * Purge les comptes invités expirés (guest_expires_at dépassé) et les sessions orphelines.
 * Usage: npm run guest:purge
 * Planification suggérée : quotidien à minuit UTC (ou laisser le scheduler intégré s'en charger).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';
import { purgeExpiredGuestAccounts } from '../src/services/guestCleanupService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const result = await purgeExpiredGuestAccounts();
  console.log(
    `[guest:purge] invités supprimés: ${result.purgedGuests} · sessions expirées: ${result.expiredSessionsRemoved}`
  );
  if (result.failedGuests > 0) {
    console.error(`[guest:purge] échecs: ${result.failedGuests}`);
    console.error(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
