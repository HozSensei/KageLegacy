#!/usr/bin/env node
/**
 * Vérifie les gels de cycle : H54 compo/entraînement, H71 tactiques/équipement.
 * Usage: npm run test:cycle-freezes
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { setHourDev, advanceToHourDev } from '../src/services/gameClock.js';
import { updateSquadComposition } from '../src/models/squadComposition.js';
import { updateBattleStrategies, updateTrainingPlans } from '../src/models/squadTactics.js';
import { equipItem } from '../src/services/equipmentService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PREFIX = `cycle_freeze_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectStatus(fn, statusCode, label) {
  let failed = false;
  try {
    await fn();
  } catch (error) {
    if (error.statusCode === statusCode) return;
    throw new Error(`${label}: attendu ${statusCode}, reçu ${error.statusCode ?? 'erreur'} — ${error.message}`);
  }
  failed = true;
  if (failed) throw new Error(`${label}: aurait dû échouer avec ${statusCode}`);
}

async function createUserWithSquad(poolId, label, clanTraitId) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `${PREFIX}_${label}`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Taijutsu', 10000, 0, 100, 'fr')`,
    [userId, label]
  );
  await query('INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)', [poolId, userId]);
  await query('INSERT INTO pool_standings (pool_id, user_id) VALUES (?, ?)', [poolId, userId]);

  const ninjaIds = [];
  for (let pos = 1; pos <= 3; pos += 1) {
    const result = await query(
      `INSERT INTO ninjas (
         user_id, name, grade, age, squad_position, preparation_type,
         taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
         moral, weekly_forme, battle_strategy, character_trait, element_affinity, clan_trait_id
       ) VALUES (?, ?, 'Chunin', 16, ?, 'Physique', 15, 15, 15, 15, 15, 15, 15, 'Passable', 'Offensive', 'Discipline', 'Katon', ?)`,
      [userId, `${label}_n${pos}`, pos, clanTraitId]
    );
    ninjaIds.push(result.insertId);
  }
  return { userId, ninjaIds };
}

async function grantMatchItem(userId) {
  const defRows = await query(
    `SELECT id FROM item_definitions WHERE category = 'match' LIMIT 1`
  );
  assert(defRows[0], 'item match en base');
  const itemResult = await query(
    `INSERT INTO user_items (user_id, item_definition_id) VALUES (?, ?)`,
    [userId, defRows[0].id]
  );
  return itemResult.insertId;
}

async function cleanup(poolId, userIds) {
  await query('DELETE FROM matches WHERE pool_id = ?', [poolId]);
  for (const userId of userIds) {
    await query('DELETE FROM ninja_equipment WHERE ninja_id IN (SELECT id FROM ninjas WHERE user_id = ?)', [
      userId,
    ]);
    await query('DELETE FROM user_items WHERE user_id = ?', [userId]);
    await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
    await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
    await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
    await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
    await query('DELETE FROM users WHERE id = ?', [userId]);
  }
  await query('DELETE FROM pools WHERE id = ?', [poolId]);
}

async function main() {
  console.log('=== Test gels de cycle H54/H71 ===\n');

  const clanRows = await query('SELECT id FROM clan_traits LIMIT 1');
  const clanTraitId = clanRows[0]?.id ?? 1;

  const poolResult = await query(
    `INSERT INTO pools (division_level, season_number, current_cycle, status) VALUES (5, 1, 1, 'active')`
  );
  const poolId = poolResult.insertId;

  const userA = await createUserWithSquad(poolId, 'alpha', clanTraitId);
  const userB = await createUserWithSquad(poolId, 'beta', clanTraitId);

  await setHourDev(40);

  await updateBattleStrategies(userA.userId, [
    { ninjaId: userA.ninjaIds[0], strategy: 'Offensive' },
  ]);
  await updateTrainingPlans(userA.userId, {
    plans: [{ ninjaId: userA.ninjaIds[0], preparationType: 'Ninjutsu' }],
  });

  await advanceToHourDev(54);

  await expectStatus(
    () =>
      updateSquadComposition(userA.userId, [
        { position: 1, ninjaId: userA.ninjaIds[0] },
        { position: 2, ninjaId: userA.ninjaIds[1] },
        { position: 3, ninjaId: userA.ninjaIds[2] },
      ]),
    423,
    'composition H54'
  );

  await expectStatus(
    () =>
      updateTrainingPlans(userA.userId, {
        plans: [{ ninjaId: userA.ninjaIds[0], preparationType: 'Physique' }],
      }),
    423,
    'entraînement H54'
  );

  await updateBattleStrategies(userA.userId, [
    { ninjaId: userA.ninjaIds[0], strategy: 'Tank' },
  ]);

  const matchItemId = await grantMatchItem(userA.userId);
  await equipItem(userA.userId, userA.ninjaIds[0], matchItemId);

  await advanceToHourDev(71);

  await expectStatus(
    () =>
      updateBattleStrategies(userA.userId, [
        { ninjaId: userA.ninjaIds[0], strategy: 'Offensive' },
      ]),
    423,
    'consignes H71'
  );

  const item2 = await grantMatchItem(userA.userId);
  await expectStatus(
    () => equipItem(userA.userId, userA.ninjaIds[1], item2),
    423,
    'équipement H71'
  );

  await cleanup(poolId, [userA.userId, userB.userId]);
  console.log('\n=== test:cycle-freezes OK ===');
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
