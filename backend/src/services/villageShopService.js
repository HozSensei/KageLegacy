import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { assertSpendingAllowed } from './economyDebt.js';
import { getClockRow } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { applyPercentDiscount, getHeritageBonuses } from './heritageService.js';

export const RESTOCK_EVERY_CYCLES = 3;
export const PROMOS_PER_CYCLE = 2;
export const PROMO_DISCOUNT_PCT = 50;

/** Prix catalogue → promo cycle → réduction héritage (Match Genjutsu / Bureau Taijutsu). */
export function computeShopItemPrice({
  basePrice,
  category,
  promoDiscountPct = 0,
  heritageMatchDiscountPct = 0,
  heritageBureauDiscountPct = 0,
}) {
  const promoPrice = Math.floor(basePrice * (1 - Number(promoDiscountPct || 0) / 100));
  let finalPrice = promoPrice;
  let heritageDiscountPct = 0;
  if (category === 'match' && heritageMatchDiscountPct > 0) {
    heritageDiscountPct = Number(heritageMatchDiscountPct);
    finalPrice = Math.max(1, applyPercentDiscount(promoPrice, heritageDiscountPct));
  } else if (category === 'bureau' && heritageBureauDiscountPct > 0) {
    heritageDiscountPct = Number(heritageBureauDiscountPct);
    finalPrice = Math.max(1, applyPercentDiscount(promoPrice, heritageDiscountPct));
  }
  return {
    basePrice,
    promoPrice,
    finalPrice,
    promoDiscountPct: Number(promoDiscountPct || 0),
    heritageDiscountPct,
  };
}

export function computeRestockPeriod(poolCycle) {
  const cycle = Number(poolCycle) || 1;
  return Math.floor((cycle - 1) / RESTOCK_EVERY_CYCLES);
}

export function cyclesUntilRestock(poolCycle) {
  const cycle = Number(poolCycle) || 1;
  const mod = (cycle - 1) % RESTOCK_EVERY_CYCLES;
  return mod === 0 ? RESTOCK_EVERY_CYCLES : RESTOCK_EVERY_CYCLES - mod;
}

async function getAllCatalogItems() {
  return query('SELECT * FROM item_definitions WHERE price > 0 ORDER BY category, id');
}

async function ensureStockForPeriod(userId, restockPeriod) {
  const existing = await query(
    `SELECT COUNT(*) AS c FROM village_shop_stock WHERE user_id = ? AND restock_period = ?`,
    [userId, restockPeriod]
  );
  if (existing[0]?.c > 0) return;

  const catalog = await getAllCatalogItems();
  for (const item of catalog) {
    const stock = item.default_stock ?? 1;
    await query(
      `INSERT INTO village_shop_stock
       (user_id, restock_period, item_definition_id, stock_initial, stock_remaining)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, restockPeriod, item.id, stock, stock]
    );
  }
}

async function pickPromoItems(userId, cycleStartAt, eligibleItems) {
  const promoEligible = eligibleItems.filter((i) => i.promo_eligible !== 0);
  if (!promoEligible.length) return [];

  const prevPromos = await query(
    `SELECT item_definition_id FROM village_shop_promos
     WHERE user_id = ? AND cycle_start_at < ?
     ORDER BY cycle_start_at DESC
     LIMIT ${PROMOS_PER_CYCLE}`,
    [userId, cycleStartAt]
  );
  const avoidIds = new Set(prevPromos.map((p) => p.item_definition_id));

  const picked = [];
  const pool = [...promoEligible];
  while (picked.length < PROMOS_PER_CYCLE && pool.length) {
    const idx = randomInt(pool.length);
    const item = pool.splice(idx, 1)[0];
    if (picked.length === 0 || !avoidIds.has(item.id) || pool.length === 0) {
      picked.push(item);
    }
  }

  return picked;
}

async function ensurePromosForCycle(userId, cycleStartAt) {
  const existing = await query(
    `SELECT id FROM village_shop_promos WHERE user_id = ? AND cycle_start_at = ? LIMIT 1`,
    [userId, cycleStartAt]
  );
  if (existing.length) return;

  const catalog = await getAllCatalogItems();
  const promoItems = await pickPromoItems(userId, cycleStartAt, catalog);
  for (const item of promoItems) {
    await query(
      `INSERT INTO village_shop_promos (user_id, cycle_start_at, item_definition_id, discount_pct)
       VALUES (?, ?, ?, ?)`,
      [userId, cycleStartAt, item.id, PROMO_DISCOUNT_PCT]
    );
  }
}

function mapShopRow(row, promoByItem, heritageMatchDiscountPct, heritageBureauDiscountPct) {
  const promoDiscountPct = promoByItem.get(row.item_definition_id) || 0;
  const pricing = computeShopItemPrice({
    basePrice: row.price,
    category: row.category,
    promoDiscountPct,
    heritageMatchDiscountPct,
    heritageBureauDiscountPct,
  });
  return {
    stockId: row.stock_id,
    itemDefinitionId: row.item_definition_id,
    slug: row.slug,
    category: row.category,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    effects: typeof row.effects === 'string' ? JSON.parse(row.effects) : row.effects,
    basePrice: pricing.basePrice,
    promoPrice: pricing.promoPrice,
    discountPct: pricing.promoDiscountPct,
    heritageDiscountPct: pricing.heritageDiscountPct,
    finalPrice: pricing.finalPrice,
    stockInitial: row.stock_initial,
    stockRemaining: row.stock_remaining,
    soldOut: row.stock_remaining <= 0,
    onPromo: pricing.promoDiscountPct > 0,
    onHeritageDiscount: pricing.heritageDiscountPct > 0,
  };
}

export async function getVillageShopForUser(userId) {
  const pool = await findUserPool(userId);
  const poolCycle = pool?.current_cycle ?? 1;
  const restockPeriod = computeRestockPeriod(poolCycle);
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at;

  await ensureStockForPeriod(userId, restockPeriod);
  if (cycleStartAt) {
    await ensurePromosForCycle(userId, cycleStartAt);
  }

  const promoRows = cycleStartAt
    ? await query(
        `SELECT item_definition_id, discount_pct FROM village_shop_promos
         WHERE user_id = ? AND cycle_start_at = ?`,
        [userId, cycleStartAt]
      )
    : [];
  const promoByItem = new Map(promoRows.map((p) => [p.item_definition_id, p.discount_pct]));
  const heritage = await getHeritageBonuses(userId);

  const stockRows = await query(
    `SELECT vss.id AS stock_id, vss.stock_initial, vss.stock_remaining,
            idf.*
     FROM village_shop_stock vss
     JOIN item_definitions idf ON idf.id = vss.item_definition_id
     WHERE vss.user_id = ? AND vss.restock_period = ?
     ORDER BY idf.category, idf.id`,
    [userId, restockPeriod]
  );

  return {
    items: stockRows.map((row) =>
      mapShopRow(
        row,
        promoByItem,
        heritage.matchShopDiscountPct,
        heritage.bureauShopDiscountPct
      )
    ),
    restockPeriod,
    poolCycle,
    cyclesUntilRestock: cyclesUntilRestock(poolCycle),
    restockEveryCycles: RESTOCK_EVERY_CYCLES,
    promoCount: promoRows.length,
  };
}

export async function purchaseVillageShopItem(userId, stockId) {
  await assertSpendingAllowed(
    userId,
    'Gel administratif — remboursez votre dette avant d\'acheter au magasin du village.'
  );

  const rows = await query(
    `SELECT vss.*, idf.price, idf.slug, idf.category, s.ryos,
            vsp.discount_pct
     FROM village_shop_stock vss
     JOIN item_definitions idf ON idf.id = vss.item_definition_id
     JOIN sensei s ON s.user_id = vss.user_id
     LEFT JOIN village_shop_promos vsp
       ON vsp.user_id = vss.user_id
      AND vsp.item_definition_id = vss.item_definition_id
      AND vsp.cycle_start_at = (SELECT cycle_start_at FROM game_clock WHERE id = 1)
     WHERE vss.id = ? AND vss.user_id = ?`,
    [stockId, userId]
  );
  const row = rows[0];
  if (!row) {
    const error = new Error('Article introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (row.stock_remaining <= 0) {
    const error = new Error('Article épuisé — attendez le prochain réassort.');
    error.statusCode = 409;
    throw error;
  }

  const heritage = await getHeritageBonuses(userId);
  const pricing = computeShopItemPrice({
    basePrice: row.price,
    category: row.category,
    promoDiscountPct: row.discount_pct || 0,
    heritageMatchDiscountPct: heritage.matchShopDiscountPct,
    heritageBureauDiscountPct: heritage.bureauShopDiscountPct,
  });
  const finalPrice = pricing.finalPrice;

  if (row.ryos < finalPrice) {
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [finalPrice, userId]);
  const itemResult = await query(
    'INSERT INTO user_items (user_id, item_definition_id) VALUES (?, ?)',
    [userId, row.item_definition_id]
  );
  await query(
    'UPDATE village_shop_stock SET stock_remaining = stock_remaining - 1 WHERE id = ?',
    [stockId]
  );

  return {
    userItemId: itemResult.insertId,
    itemDefinitionId: row.item_definition_id,
    slug: row.slug,
    pricePaid: finalPrice,
    discountPct: pricing.promoDiscountPct,
    heritageDiscountPct: pricing.heritageDiscountPct,
  };
}

export async function ensureVillageShopForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  for (const user of users) {
    await getVillageShopForUser(user.id);
  }
  return users.length;
}
