#!/usr/bin/env node
/**
 * Vérifie que le poids d'entraînement (bureau) applique training_weights.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { useBureauItem } from '../src/services/bureauItemService.js';
import { getTrainingBuffMultiplier } from '../src/services/training.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PREFIX = `bureau_boost_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup(userId) {
  await query('DELETE FROM user_items WHERE user_id = ?', [userId]);
  await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function main() {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `${PREFIX}_user`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, 'Test', 'Taijutsu', 10000, 0, 100, 'fr')`,
    [userId]
  );

  const ninjaResult = await query(
    `INSERT INTO ninjas (
       user_id, name, grade, age, squad_position, preparation_type,
       taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
       moral, weekly_forme, character_trait, element_affinity
     ) VALUES (?, 'Boost', 'Genin', 16, 1, 'Physique', 10, 10, 10, 10, 10, 10, 15, 'Passable', 'Discipline', 'Katon')`,
    [userId]
  );
  const ninjaId = ninjaResult.insertId;

  const defRows = await query(
    `SELECT id FROM item_definitions WHERE slug = 'poids-entrainement' AND category = 'bureau'`
  );
  assert(defRows[0], 'poids-entrainement bureau en base');

  const itemResult = await query(
    `INSERT INTO user_items (user_id, item_definition_id) VALUES (?, ?)`,
    [userId, defRows[0].id]
  );
  const userItemId = itemResult.insertId;

  const result = await useBureauItem(userId, userItemId, ninjaId);
  assert(result.effect === 'training_boost', 'effet training_boost');
  assert(result.buff === 'training_weights', 'buff training_weights');

  const ninjaRows = await query('SELECT training_buff FROM ninjas WHERE id = ?', [ninjaId]);
  assert(ninjaRows[0]?.training_buff === 'training_weights', 'training_buff en base');

  const consumedRows = await query('SELECT consumed FROM user_items WHERE id = ?', [userItemId]);
  assert(consumedRows[0]?.consumed === 1, 'objet consommé');

  assert(getTrainingBuffMultiplier({ training_buff: 'training_weights' }) === 1.2, 'multiplicateur 1.2');

  await cleanup(userId);
  console.log('test:bureau-training-boost OK');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
