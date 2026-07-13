#!/usr/bin/env node
/**
 * Vérifie les gels de cycle : H54 compo/entraînement, H71 deck/équipement.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { setHourDev, advanceToHourDev } from '../src/services/gameClock.js';
import { updateSquadComposition } from '../src/models/squadComposition.js';
import { updateTrainingPlans } from '../src/models/squadTactics.js';
import { equipItem } from '../src/services/equipmentService.js';
import { saveOperationDeck } from '../src/services/operationDeckService.js';
import { grantTacticCard } from '../src/services/tacticCards/tacticCardService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PREFIX = `cycle_freeze_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectStatus(fn, statusCode, label) {
  try {
    await fn();
  } catch (error) {
    if (error.status === statusCode || error.statusCode === statusCode) return;
    throw new Error(`${label}: attendu ${statusCode}, reçu ${error.statusCode ?? error.status ?? 'erreur'} — ${error.message}`);
  }
  throw new Error(`${label}: aurait dû échouer avec ${statusCode}`);
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
         moral, weekly_forme, character_trait, element_affinity, clan_trait_id
       ) VALUES (?, ?, 'Chunin', 16, ?, 'Physique', 15, 15, 15, 15, 15, 15, 15, 'Passable', 'Discipline', 'Katon', ?)`,
      [userId, `${label}_n${pos}`, pos, clanTraitId]
    );
    ninjaIds.push(result.insertId);
  }
  return { userId, ninjaIds };
}

async function grantCycleItem(userId) {
  const defRows = await query(
    `SELECT id FROM item_definitions WHERE category = 'cycle' LIMIT 1`
  );
  assert(defRows[0], 'item cycle en base');
  const itemResult = await query(
    `INSERT INTO user_items (user_id, item_definition_id) VALUES (?, ?)`,
    [userId, defRows[0].id]
  );
  return itemResult.insertId;
}

async function cleanup(poolId, userIds) {
  await query('DELETE FROM matches WHERE pool_id = ?', [poolId]);
  for (const userId of userIds) {
    await query('DELETE FROM operation_decks WHERE user_id = ?', [userId]);
    await query('DELETE FROM ninja_equipment WHERE ninja_id IN (SELECT id FROM ninjas WHERE user_id = ?)', [
      userId,
    ]);
    await query('DELETE FROM user_items WHERE user_id = ?', [userId]);
    await query('DELETE FROM user_tactic_cards WHERE user_id = ?', [userId]);
    await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
    await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
    await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
    await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
    await query('DELETE FROM users WHERE id = ?', [userId]);
  }
  await query('DELETE FROM pools WHERE id = ?', [poolId]);
}

async function main() {
  const clanRows = await query('SELECT id FROM clan_traits LIMIT 1');
  const clanTraitId = clanRows[0]?.id ?? 1;

  const poolResult = await query(
    `INSERT INTO pools (division_level, season_number, current_cycle, status) VALUES (5, 1, 1, 'active')`
  );
  const poolId = poolResult.insertId;

  const userA = await createUserWithSquad(poolId, 'alpha', clanTraitId);
  const userB = await createUserWithSquad(poolId, 'beta', clanTraitId);

  const card = await grantTacticCard(userA.userId, 'tai-parade-ecole');
  assert(card?.userTacticCardId, 'carte accordée');

  await setHourDev(40);

  await saveOperationDeck(userA.userId, {
    elementCardIds: [card.userTacticCardId],
    techniquesByNinjaId: {
      [userA.ninjaIds[0]]: { primary: 'taijutsu', secondary: 'ninjutsu' },
    },
  });

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

  await saveOperationDeck(userA.userId, {
    elementCardIds: [card.userTacticCardId],
    techniquesByNinjaId: {
      [userA.ninjaIds[0]]: { primary: 'genjutsu', secondary: 'ninjutsu' },
    },
  });

  const cycleItemId = await grantCycleItem(userA.userId);
  await equipItem(userA.userId, userA.ninjaIds[0], cycleItemId);

  await advanceToHourDev(71);

  await expectStatus(
    () =>
      saveOperationDeck(userA.userId, {
        elementCardIds: [card.userTacticCardId],
        techniquesByNinjaId: {
          [userA.ninjaIds[0]]: { primary: 'taijutsu', secondary: 'medecine' },
        },
      }),
    403,
    'deck H71'
  );

  const item2 = await grantCycleItem(userA.userId);
  await expectStatus(
    () => equipItem(userA.userId, userA.ninjaIds[1], item2),
    423,
    'équipement H71'
  );

  await cleanup(poolId, [userA.userId, userB.userId]);
  console.log('test:cycle-freezes OK');
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
