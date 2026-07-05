import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';

export async function getAllItemDefinitions() {
  return query('SELECT * FROM item_definitions ORDER BY id');
}

export async function getItemDefinitionById(id) {
  const rows = await query('SELECT * FROM item_definitions WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function getMarketOffers(userId, cycleStartAt) {
  return query(
    `SELECT mo.*, idf.slug, idf.category, idf.name_fr, idf.name_en,
            idf.description_fr, idf.description_en, idf.price, idf.effects
     FROM market_offers mo
     JOIN item_definitions idf ON idf.id = mo.item_definition_id
     WHERE mo.user_id = ? AND mo.cycle_start_at = ?
     ORDER BY mo.slot_index`,
    [userId, cycleStartAt]
  );
}

export async function ensureMarketForUser(userId, cycleStartAt) {
  const existing = await getMarketOffers(userId, cycleStartAt);
  if (existing.length >= 3) return existing;

  const catalog = await getAllItemDefinitions();
  if (catalog.length < 3) return existing;

  const picked = new Set();
  const offers = [];
  while (offers.length < 3 && picked.size < catalog.length) {
    const item = catalog[randomInt(catalog.length)];
    if (picked.has(item.id)) continue;
    picked.add(item.id);
    offers.push(item);
  }

  for (let slot = 0; slot < offers.length; slot += 1) {
    await query(
      `INSERT IGNORE INTO market_offers (user_id, cycle_start_at, item_definition_id, slot_index)
       VALUES (?, ?, ?, ?)`,
      [userId, cycleStartAt, offers[slot].id, slot]
    );
  }

  return getMarketOffers(userId, cycleStartAt);
}

export async function ensureMarketForAllUsers(cycleStartAt) {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];
  for (const user of users) {
    const offers = await ensureMarketForUser(user.id, cycleStartAt);
    results.push({ userId: user.id, offers: offers.length });
  }
  return results;
}

export async function purchaseOffer(userId, offerId) {
  const rows = await query(
    `SELECT mo.*, idf.price, idf.category, s.ryos
     FROM market_offers mo
     JOIN item_definitions idf ON idf.id = mo.item_definition_id
     JOIN sensei s ON s.user_id = mo.user_id
     WHERE mo.id = ? AND mo.user_id = ?`,
    [offerId, userId]
  );
  const offer = rows[0];
  if (!offer) {
    const error = new Error('Offre introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (offer.purchased) {
    const error = new Error('Cet objet a déjà été acheté.');
    error.statusCode = 409;
    throw error;
  }
  if (offer.ryos < offer.price) {
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [offer.price, userId]);
  const itemResult = await query(
    'INSERT INTO user_items (user_id, item_definition_id) VALUES (?, ?)',
    [userId, offer.item_definition_id]
  );
  await query('UPDATE market_offers SET purchased = TRUE WHERE id = ?', [offerId]);

  return {
    userItemId: itemResult.insertId,
    itemDefinitionId: offer.item_definition_id,
    price: offer.price,
  };
}
