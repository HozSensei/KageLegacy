/**
 * Tests bonus héritage magasin : Genjutsu (−% Match) et Taijutsu (−% Bureau).
 * Usage: node backend/scripts/testHeritageMatchShop.js
 */

import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import { createHeritageScroll, getHeritageBonuses } from '../src/services/heritageService.js';
import { computeShopItemPrice } from '../src/services/villageShopService.js';

function testPricingUnit() {
  const noHeritage = computeShopItemPrice({
    basePrice: 500,
    category: 'match',
    promoDiscountPct: 0,
    heritageMatchDiscountPct: 0,
  });
  assert.equal(noHeritage.finalPrice, 500);

  const heritageOnly = computeShopItemPrice({
    basePrice: 500,
    category: 'match',
    promoDiscountPct: 0,
    heritageMatchDiscountPct: 9,
  });
  assert.equal(heritageOnly.finalPrice, 455);

  const promoAndHeritage = computeShopItemPrice({
    basePrice: 1000,
    category: 'match',
    promoDiscountPct: 50,
    heritageMatchDiscountPct: 6,
  });
  assert.equal(promoAndHeritage.promoPrice, 500);
  assert.equal(promoAndHeritage.finalPrice, 470);

  const bureauIgnored = computeShopItemPrice({
    basePrice: 400,
    category: 'bureau',
    promoDiscountPct: 0,
    heritageMatchDiscountPct: 15,
  });
  assert.equal(bureauIgnored.finalPrice, 400);

  const bureauHeritage = computeShopItemPrice({
    basePrice: 450,
    category: 'bureau',
    promoDiscountPct: 0,
    heritageBureauDiscountPct: 9,
  });
  assert.equal(bureauHeritage.finalPrice, 409);

  const matchIgnoredForBureau = computeShopItemPrice({
    basePrice: 450,
    category: 'bureau',
    promoDiscountPct: 0,
    heritageBureauDiscountPct: 0,
    heritageMatchDiscountPct: 15,
  });
  assert.equal(matchIgnoredForBureau.finalPrice, 450);
}

async function testHeritageBonusesAggregation() {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `test_heritage_shop_${Date.now()}`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, 'Test', 'Ninjutsu', 10000, 0, 100, 'fr')`,
    [userId]
  );

  await createHeritageScroll(userId, {
    name: 'Genin Illusion',
    taijutsu: 8,
    ninjutsu: 10,
    genjutsu: 16,
    medecine: 6,
  });

  const bonuses = await getHeritageBonuses(userId);
  assert.equal(bonuses.matchShopDiscountPct, 3);

  await query('DELETE FROM heritage_scrolls WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function testTaijutsuBureauBonuses() {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `test_heritage_bureau_${Date.now()}`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, 'Test', 'Taijutsu', 10000, 0, 100, 'fr')`,
    [userId]
  );

  await createHeritageScroll(userId, {
    name: 'Chunin Poing',
    taijutsu: 18,
    ninjutsu: 8,
    genjutsu: 6,
    medecine: 5,
  });

  const bonuses = await getHeritageBonuses(userId);
  assert.equal(bonuses.bureauShopDiscountPct, 3);
  assert.equal(bonuses.matchShopDiscountPct, 0);

  await query('DELETE FROM heritage_scrolls WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function main() {
  testPricingUnit();
  await testHeritageBonusesAggregation();
  await testTaijutsuBureauBonuses();
  console.log('testHeritageMatchShop: OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
