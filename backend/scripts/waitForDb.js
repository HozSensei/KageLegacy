#!/usr/bin/env node
/**
 * Attend que MySQL soit joignable (démarrage Docker / NAS).
 */
import pool from '../src/config/database.js';

const MAX_ATTEMPTS = 60;
const DELAY_MS = 2000;

async function waitForDb() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('✅ MySQL prêt');
      await pool.end();
      return;
    } catch (error) {
      console.log(`⏳ MySQL indisponible (${attempt}/${MAX_ATTEMPTS}) — ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.error('❌ MySQL inaccessible après plusieurs tentatives.');
  process.exit(1);
}

await waitForDb();
