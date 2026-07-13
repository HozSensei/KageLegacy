#!/usr/bin/env node
/**
 * Reconduction deck d'opération cycle N → N+1.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import {
  carryOperationDecksForPool,
  ensureOperationDeckFromPreviousCycle,
  filterTechniqueSlotsForActiveSquad,
  getOperationDeck,
  saveOperationDeck,
} from '../src/services/operationDeckService.js';
import { grantTacticCard } from '../src/services/tacticCards/tacticCardService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PREFIX = `deck_carry_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup(poolId, userId) {
  await query('DELETE FROM operation_decks WHERE user_id = ?', [userId]);
  await query('DELETE FROM user_tactic_cards WHERE user_id = ?', [userId]);
  await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
  await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
  await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
  await query('DELETE FROM pools WHERE id = ?', [poolId]);
}

async function main() {
  const filtered = filterTechniqueSlotsForActiveSquad({ 1: [10, 11], 99: [12] }, [1, 2]);
  assert(filtered['1']?.length === 2, 'filtre slots actifs');
  assert(!filtered['99'], 'ninjas hors escouade exclus');

  const defRows = await query('SELECT COUNT(*) AS c FROM tactic_card_definitions WHERE slug = ?', [
    'tai-lame-chakras',
  ]);
  if (!Number(defRows[0]?.c)) {
    console.error('SKIP: migration 052 non appliquée.');
    process.exit(0);
  }

  const poolResult = await query(
    `INSERT INTO pools (division_level, season_number, current_cycle, status) VALUES (5, 1, 1, 'active')`
  );
  const poolId = poolResult.insertId;

  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [`${PREFIX}_u`]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, 'Sensei', 'Taijutsu', 5000, 0, 100, 'fr')`,
    [userId]
  );
  await query('INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)', [poolId, userId]);
  await query('INSERT INTO pool_standings (pool_id, user_id) VALUES (?, ?)', [poolId, userId]);

  const ninjaIds = [];
  for (let pos = 1; pos <= 3; pos += 1) {
    const row = await query(
      `INSERT INTO ninjas (
         user_id, name, grade, age, squad_position, taijutsu, ninjutsu, genjutsu,
         medecine, vitesse, intelligence, moral, weekly_forme, character_trait, element_affinity
       ) VALUES (?, ?, 'Chunin', 16, ?, 10, 10, 10, 10, 10, 10, 15, 'Passable', 'Discipline', 'Katon')`,
      [userId, `N${pos}`, pos]
    );
    ninjaIds.push(row.insertId);
  }

  const cardA = await grantTacticCard(userId, 'tai-lame-chakras');
  const cardB = await grantTacticCard(userId, 'nin-afflux-chakra');
  const cardC = await grantTacticCard(userId, 'gen-mirage-simple');
  assert(cardA?.userTacticCardId && cardB?.userTacticCardId && cardC?.userTacticCardId, 'cartes accordées');

  await saveOperationDeck(userId, {
    techniqueSlotsByNinjaId: {
      [ninjaIds[0]]: [cardA.userTacticCardId, cardB.userTacticCardId],
      [ninjaIds[1]]: [cardC.userTacticCardId],
    },
  });

  await query('UPDATE user_tactic_cards SET charges_remaining = 0 WHERE id = ?', [cardB.userTacticCardId]);
  await query('UPDATE pools SET current_cycle = 2 WHERE id = ?', [poolId]);

  const carried = await ensureOperationDeckFromPreviousCycle(userId, 2);
  assert(carried?.fromCycle === 1, 'reconduction depuis cycle 1');
  assert(carried.techniqueCount === 2, 'carte épuisée exclue');

  const deckCycle2 = await getOperationDeck(userId, 2);
  const slots0 = deckCycle2.techniqueSlotsByNinjaId[ninjaIds[0]] || [];
  assert(slots0.includes(cardA.userTacticCardId), 'carte valide reconduite');
  assert(!slots0.includes(cardB.userTacticCardId), 'carte sans charge non reconduite');
  assert(
    (deckCycle2.techniqueSlotsByNinjaId[ninjaIds[1]] || []).includes(cardC.userTacticCardId),
    'autre ninja reconduit'
  );

  await query('DELETE FROM operation_decks WHERE user_id = ? AND season_cycle = 2', [userId]);
  const bulk = await carryOperationDecksForPool(poolId, 2);
  assert(bulk.some((r) => r.userId === userId), 'carry pool');

  await cleanup(poolId, userId);
  console.log('test:operation-deck-carryover OK');
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
