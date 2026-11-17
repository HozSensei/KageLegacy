#!/usr/bin/env node
/**
 * Garantit un personnage TCG pour demo_sensei (routes V2 requiresCharacter).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { createCharacter, getCharacter } from '../src/services/playerCharacterService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function demoUserId() {
  const rows = await query(
    `SELECT u.id FROM users u
     WHERE u.username = 'demo_sensei' LIMIT 1`
  );
  return rows[0]?.id;
}

async function main() {
  const userId = await demoUserId();
  if (!userId) {
    console.error('Compte demo_sensei introuvable — npm run db:seed');
    process.exit(1);
  }

  let character = await getCharacter(userId);
  if (!character) {
    character = await createCharacter(userId, {
      name: 'Demo Genin',
      elementAffinity: 'Katon',
    });
  }

  console.log(
    `E2E_RESULT:${JSON.stringify({
      ok: true,
      userId,
      characterId: character.id,
      name: character.name,
      level: character.level,
    })}`
  );
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
