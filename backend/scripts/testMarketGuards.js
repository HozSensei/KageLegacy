/**
 * Tests objets non vendables + libération ninja.
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import { getInventoryForUser } from '../src/services/equipmentService.js';
import { createItemListing } from '../src/services/playerMarketService.js';
import { releaseNinja, MIN_ROSTER_SIZE } from '../src/services/ninjaReleaseService.js';
import { createNinja } from '../src/models/ninja.js';
import { generateNinjaProfile } from '../src/services/ninjaGenerator.js';
import { findAllClanTraits } from '../src/models/clanTrait.js';

async function createTestUser(label) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `${label}_${Date.now()}`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, 'Test', 'Ninjutsu', 10000, 0, 100, 'fr')`,
    [userId]
  );
  return userId;
}

async function cleanupUser(userId) {
  await query('DELETE FROM player_listings WHERE seller_user_id = ?', [userId]);
  await query('DELETE FROM user_items WHERE user_id = ?', [userId]);
  await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function testNonVendableSeal() {
  const userId = await createTestUser('non_vendable');
  const sealRows = await query(`SELECT id FROM item_definitions WHERE slug = 'sceau-chakra'`);
  assert.ok(sealRows[0]?.id, 'sceau-chakra exists');
  const itemResult = await query(
    'INSERT INTO user_items (user_id, item_definition_id) VALUES (?, ?)',
    [userId, sealRows[0].id]
  );

  const inventory = await getInventoryForUser(userId);
  const seal = inventory.items.find((item) => item.slug === 'sceau-chakra');
  assert.ok(seal?.nonVendable, 'inventory exposes nonVendable');

  let blocked = false;
  try {
    await createItemListing(userId, itemResult.insertId, 1);
  } catch (error) {
    blocked = error.statusCode === 400;
  }
  assert.ok(blocked, 'sceau-chakra cannot be listed');

  await cleanupUser(userId);
}

async function testReleaseBenchNinja() {
  const userId = await createTestUser('release');
  const clans = await findAllClanTraits();
  const profiles = [];
  for (let i = 0; i < MIN_ROSTER_SIZE + 1; i++) {
    profiles.push(
      await generateNinjaProfile({
        clans,
        grade: 'Genin',
        language: 'fr',
        recruitmentOptions: { forceRoturier: true },
      })
    );
  }

  const ninjas = [];
  for (let i = 0; i < profiles.length; i++) {
    const ninja = await createNinja({
      user_id: userId,
      ...profiles[i],
      moral: 15,
      weekly_forme: 'Passable',
      squad_position: i < 3 ? i + 1 : null,
    });
    ninjas.push(ninja);
  }

  const benchNinja = ninjas[3];
  const result = await releaseNinja(userId, benchNinja.id);
  assert.equal(result.ninjaId, benchNinja.id);

  const remaining = await query('SELECT id FROM ninjas WHERE user_id = ?', [userId]);
  assert.equal(remaining.length, MIN_ROSTER_SIZE);

  let blockedMin = false;
  try {
    await releaseNinja(userId, remaining[0].id);
  } catch (error) {
    blockedMin = error.statusCode === 400;
  }
  assert.ok(blockedMin, 'cannot release below minimum roster');

  await cleanupUser(userId);
}

async function main() {
  await testNonVendableSeal();
  await testReleaseBenchNinja();
  console.log('testMarketGuards: OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
