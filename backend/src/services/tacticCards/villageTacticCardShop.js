import { query } from '../../config/database.js';
import { assertSpendingAllowed } from '../economyDebt.js';
import { findUserPool } from '../poolService.js';
import { getHeritageBonuses, applyPercentDiscount } from '../heritageService.js';
import { computeRestockPeriod, cyclesUntilRestock, RESTOCK_EVERY_CYCLES } from '../villageShopService.js';
import { grantTacticCard } from './tacticCardService.js';
import { pickShopSlugs } from './tacticCardCatalog.js';

async function ensureCardStock(userId, restockPeriod) {
  const slugs = pickShopSlugs(userId, restockPeriod);
  for (const slug of slugs) {
    const defRows = await query('SELECT id FROM tactic_card_definitions WHERE slug = ?', [slug]);
    const defId = defRows[0]?.id;
    if (!defId) continue;
    await query(
      `INSERT IGNORE INTO village_shop_card_stock (user_id, restock_period, tactic_card_definition_id, stock_remaining)
       VALUES (?, ?, ?, 1)`,
      [userId, restockPeriod, defId]
    );
  }
}

export async function getVillageTacticCardOffers(userId) {
  const pool = await findUserPool(userId);
  const poolCycle = pool?.current_cycle ?? 1;
  const restockPeriod = computeRestockPeriod(poolCycle);
  await ensureCardStock(userId, restockPeriod);

  const heritage = await getHeritageBonuses(userId);
  const rows = await query(
    `SELECT vscs.id AS stock_id, vscs.stock_remaining,
            tcd.slug, tcd.name_fr, tcd.name_en, tcd.description_fr, tcd.description_en,
            tcd.rarity, tcd.card_type, tcd.catalog_price
     FROM village_shop_card_stock vscs
     JOIN tactic_card_definitions tcd ON tcd.id = vscs.tactic_card_definition_id
     WHERE vscs.user_id = ? AND vscs.restock_period = ?
     ORDER BY tcd.catalog_price ASC`,
    [userId, restockPeriod]
  );

  return {
    restockPeriod,
    poolCycle,
    cyclesUntilRestock: cyclesUntilRestock(poolCycle),
    restockEveryCycles: RESTOCK_EVERY_CYCLES,
    cards: rows.map((row) => {
      const basePrice = row.catalog_price;
      const finalPrice = applyPercentDiscount(basePrice, heritage.matchShopDiscountPct);
      return {
        stockId: row.stock_id,
        slug: row.slug,
        nameFr: row.name_fr,
        nameEn: row.name_en,
        descriptionFr: row.description_fr,
        descriptionEn: row.description_en,
        rarity: row.rarity,
        cardType: row.card_type,
        basePrice,
        heritageDiscountPct: heritage.matchShopDiscountPct,
        finalPrice,
        stockRemaining: row.stock_remaining,
        soldOut: row.stock_remaining <= 0,
      };
    }),
  };
}

export async function purchaseVillageTacticCard(userId, stockId) {
  await assertSpendingAllowed(
    userId,
    'Gel administratif — remboursez votre dette avant d\'acheter au magasin du village.'
  );

  const rows = await query(
    `SELECT vscs.*, tcd.slug, tcd.catalog_price, s.ryos
     FROM village_shop_card_stock vscs
     JOIN tactic_card_definitions tcd ON tcd.id = vscs.tactic_card_definition_id
     JOIN sensei s ON s.user_id = vscs.user_id
     WHERE vscs.id = ? AND vscs.user_id = ?`,
    [stockId, userId]
  );
  const row = rows[0];
  if (!row) {
    const error = new Error('Offre de carte introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (row.stock_remaining <= 0) {
    const error = new Error('Cette carte est épuisée pour cette période.');
    error.statusCode = 409;
    throw error;
  }

  const heritage = await getHeritageBonuses(userId);
  const price = applyPercentDiscount(row.catalog_price, heritage.matchShopDiscountPct);
  if (row.ryos < price) {
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [price, userId]);
  await query('UPDATE village_shop_card_stock SET stock_remaining = 0 WHERE id = ?', [stockId]);
  const granted = await grantTacticCard(userId, row.slug);

  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [userId]);
  return {
    slug: row.slug,
    price,
    userTacticCardId: granted?.userTacticCardId,
    ryos: senseiRows[0]?.ryos ?? 0,
  };
}
