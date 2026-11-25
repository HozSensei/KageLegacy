/**
 * Inventaire ninja — coffre (sûr) + poche (risquée en mission).
 */
import { query, getConnection } from '../config/database.js';
import {
  PURSE_STAKES,
  isValidPurseStake,
} from '../config/missionRunEconomy.js';
import {
  getItem,
  boosterItemKey,
  rollAccountDailyOffer,
  utcDayKey,
} from '../config/itemCatalog.js';
import { addCard } from './collectionService.js';
import { notifyGain } from './userNotificationService.js';

function httpError(statusCode, message, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeItemRow(row) {
  const def = getItem(row.item_key);
  return {
    id: row.id,
    itemKey: row.item_key,
    location: row.location,
    quantity: Number(row.quantity) || 0,
    meta: parseJson(row.meta_json, null),
    kind: def?.kind || null,
    rarity: def?.rarity || null,
    boosterType: def?.boosterType || null,
    nameFr: def?.nameFr || row.item_key,
    nameEn: def?.nameEn || row.item_key,
    descriptionFr: def?.descriptionFr || '',
    descriptionEn: def?.descriptionEn || '',
    effect: def?.effect || null,
  };
}

function inventoryGrant(itemKey, amount = 1) {
  const def = getItem(itemKey);
  return {
    type: 'inventory_item',
    itemKey,
    amount: Math.max(1, Number(amount) || 1),
    nameFr: def?.nameFr || itemKey,
    nameEn: def?.nameEn || itemKey,
  };
}

async function tableExists(name) {
  const rows = await query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

/**
 * La poche est verrouillée tant qu’une run solo/coop (ou autre consommateur) est active.
 * Les grants de fin de run (depositRunLootToPouch) ne passent pas par assertPouchEditable.
 */
export async function getPouchLockStatus(userId) {
  if (!userId) return { locked: false, reason: null, runId: null, kind: null };

  if (await tableExists('mission_runs')) {
    const solo = await query(
      `SELECT id FROM mission_runs
       WHERE user_id = ? AND state = 'in_progress'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    if (solo[0]) {
      return { locked: true, reason: 'mission_run', runId: solo[0].id, kind: 'mission' };
    }
  }

  if (await tableExists('coop_mission_runs')) {
    const coop = await query(
      `SELECT id FROM coop_mission_runs
       WHERE state = 'in_progress' AND (host_id = ? OR guest_id = ?)
       ORDER BY created_at DESC LIMIT 1`,
      [userId, userId],
    );
    if (coop[0]) {
      return { locked: true, reason: 'coop_run', runId: coop[0].id, kind: 'coop' };
    }
  }

  return { locked: false, reason: null, runId: null, kind: null };
}

export async function assertPouchEditable(userId) {
  const status = await getPouchLockStatus(userId);
  if (!status.locked) return status;
  const msg =
    status.kind === 'coop'
      ? 'Poche verrouillée : mission d’équipe en cours.'
      : 'Poche verrouillée : mission en cours.';
  throw httpError(409, msg, 'POUCH_LOCKED');
}

export async function getPouchRyos(userId) {
  const rows = await query(
    'SELECT pouch_ryos FROM player_profiles WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!rows[0]) throw httpError(404, 'Profil introuvable.');
  return Math.max(0, Number(rows[0].pouch_ryos) || 0);
}

export async function getInventory(userId) {
  const pouchLock = await getPouchLockStatus(userId);
  if (!(await tableExists('user_inventory_items'))) {
    return {
      chest: [],
      pouch: [],
      pouchRyos: await getPouchRyos(userId).catch(() => 0),
      pouchLocked: pouchLock.locked,
      pouchLock,
    };
  }
  const rows = await query(
    `SELECT id, item_key, location, quantity, meta_json
     FROM user_inventory_items WHERE user_id = ?
     ORDER BY location, item_key`,
    [userId],
  );
  const chest = [];
  const pouch = [];
  for (const row of rows) {
    const entry = serializeItemRow(row);
    if (row.location === 'pouch') pouch.push(entry);
    else chest.push(entry);
  }
  return {
    chest,
    pouch,
    pouchRyos: await getPouchRyos(userId),
    pouchLocked: pouchLock.locked,
    pouchLock,
  };
}

async function upsertStack(userId, itemKey, location, qty, meta = null, connection = null) {
  const amount = Math.max(1, Number(qty) || 1);
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const existing = await run(
    `SELECT id, quantity FROM user_inventory_items
     WHERE user_id = ? AND item_key = ? AND location = ? LIMIT 1`,
    [userId, itemKey, location],
  );
  if (existing[0]) {
    await run('UPDATE user_inventory_items SET quantity = quantity + ? WHERE id = ?', [
      amount,
      existing[0].id,
    ]);
    return existing[0].id;
  }
  const result = await run(
    `INSERT INTO user_inventory_items (user_id, item_key, location, quantity, meta_json)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, itemKey, location, amount, meta != null ? JSON.stringify(meta) : null],
  );
  return result.insertId;
}

async function consumeStack(userId, itemKey, location, qty = 1, connection = null) {
  const amount = Math.max(1, Number(qty) || 1);
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const lockSql = connection
    ? `SELECT id, quantity FROM user_inventory_items
       WHERE user_id = ? AND item_key = ? AND location = ? LIMIT 1 FOR UPDATE`
    : `SELECT id, quantity FROM user_inventory_items
       WHERE user_id = ? AND item_key = ? AND location = ? LIMIT 1`;
  const rows = await run(lockSql, [userId, itemKey, location]);
  const found = rows[0];
  if (!found || Number(found.quantity) < amount) {
    throw httpError(400, 'Quantité insuffisante.', 'INSUFFICIENT_ITEM');
  }
  const next = Number(found.quantity) - amount;
  if (next <= 0) {
    await run('DELETE FROM user_inventory_items WHERE id = ?', [found.id]);
  } else {
    await run('UPDATE user_inventory_items SET quantity = ? WHERE id = ?', [next, found.id]);
  }
  return true;
}

export async function grantToLocation(
  userId,
  itemKey,
  { quantity = 1, location = 'chest', meta = null, notify = false, source = 'grant' } = {},
) {
  if (!userId) throw httpError(400, 'userId requis.');
  const def = getItem(itemKey);
  if (!def) throw httpError(404, 'Objet inconnu.');
  if (!(await tableExists('user_inventory_items'))) {
    throw httpError(503, 'Tables inventaire absentes — lancez les migrations.');
  }
  await upsertStack(userId, itemKey, location, quantity, meta);
  if (notify) {
    try {
      await notifyGain(userId, {
        source,
        grants: [inventoryGrant(itemKey, quantity)],
        href: '/inventaire',
      });
    } catch {
      /* optionnel */
    }
  }
  return getInventory(userId);
}

export async function grantToChest(userId, itemKey, opts = {}) {
  return grantToLocation(userId, itemKey, { ...opts, location: 'chest' });
}

export async function grantToPouch(userId, itemKey, opts = {}) {
  return grantToLocation(userId, itemKey, { ...opts, location: 'pouch' });
}

export async function grantBoosterToChest(userId, boosterType, opts = {}) {
  return grantToChest(userId, boosterItemKey(boosterType), {
    ...opts,
    notify: opts.notify !== false,
    source: opts.source || 'battle_pass',
  });
}

export async function moveItem(userId, itemKey, { from, to, quantity = 1 } = {}) {
  if (!['chest', 'pouch'].includes(from) || !['chest', 'pouch'].includes(to)) {
    throw httpError(400, 'Emplacement invalide.');
  }
  if (from === to) return getInventory(userId);
  if (from === 'pouch' || to === 'pouch') {
    await assertPouchEditable(userId);
  }
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await consumeStack(userId, itemKey, from, quantity, connection);
    await upsertStack(userId, itemKey, to, quantity, null, connection);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
  if (to === 'pouch') {
    try {
      const { onOnboardingAction } = await import('./onboardingService.js');
      await onOnboardingAction(userId, 'pouch_item');
    } catch {
      /* optionnel */
    }
  }
  return getInventory(userId);
}

/** Charge des Ryos du compte vers la poche (paliers PURSE_STAKES). */
export async function setPouchRyos(userId, targetStake) {
  if (!isValidPurseStake(targetStake)) {
    throw httpError(400, 'Montant de bourse invalide (0/100/200/300).');
  }
  await assertPouchEditable(userId);
  const target = Number(targetStake) || 0;
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT ryos, pouch_ryos FROM player_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (!rows[0]) throw httpError(404, 'Profil introuvable.');
    const account = Number(rows[0].ryos) || 0;
    const currentPouch = Number(rows[0].pouch_ryos) || 0;
    const delta = target - currentPouch;
    if (delta > 0 && account < delta) {
      throw httpError(400, `Ryos insuffisants (${account}/${delta}).`, 'INSUFFICIENT_RYOS');
    }
    await connection.execute(
      'UPDATE player_profiles SET ryos = ryos - ?, pouch_ryos = ? WHERE user_id = ?',
      [delta, target, userId],
    );
    await connection.commit();
    if (target > 0) {
      try {
        const { onOnboardingAction } = await import('./onboardingService.js');
        await onOnboardingAction(userId, 'pouch_ryos');
      } catch {
        /* optionnel */
      }
    }
    return { pouchRyos: target, ryos: account - delta, stakes: PURSE_STAKES };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/** Consomme la poche au lancement de mission → { purseStake, items[] }. */
export async function consumePouchForRun(userId) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [profiles] = await connection.execute(
      'SELECT pouch_ryos FROM player_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (!profiles[0]) throw httpError(404, 'Profil introuvable.');
    const purseStake = Math.max(0, Number(profiles[0].pouch_ryos) || 0);
    if (!isValidPurseStake(purseStake)) {
      throw httpError(400, 'Bourse de poche invalide — rééquilibrez dans l’inventaire.');
    }
    const [items] = await connection.execute(
      `SELECT id, item_key, quantity, meta_json FROM user_inventory_items
       WHERE user_id = ? AND location = 'pouch' FOR UPDATE`,
      [userId],
    );
    const loadout = [];
    for (const row of items) {
      loadout.push({
        itemKey: row.item_key,
        quantity: Number(row.quantity) || 1,
        meta: parseJson(row.meta_json, null),
      });
    }
    if (items.length) {
      await connection.execute(
        "DELETE FROM user_inventory_items WHERE user_id = ? AND location = 'pouch'",
        [userId],
      );
    }
    await connection.execute('UPDATE player_profiles SET pouch_ryos = 0 WHERE user_id = ?', [
      userId,
    ]);
    await connection.commit();
    return { purseStake, items: loadout };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/** Vide la poche (défaite / abandon). */
export async function clearPouch(userId) {
  if (!(await tableExists('user_inventory_items'))) return;
  await query("DELETE FROM user_inventory_items WHERE user_id = ? AND location = 'pouch'", [
    userId,
  ]);
  await query('UPDATE player_profiles SET pouch_ryos = 0 WHERE user_id = ?', [userId]);
}

/** Dépose une liste d’items (scellés / restes de run) dans la poche. */
export async function depositRunLootToPouch(userId, entries = []) {
  const deposited = [];
  for (const entry of entries) {
    const key = entry.itemKey || entry.itemId || entry.id;
    if (!key || !getItem(key)) continue;
    const qty = Math.max(1, Number(entry.quantity) || 1);
    await grantToPouch(userId, key, { quantity: qty, meta: entry.meta || null, notify: false });
    deposited.push({ itemKey: key, quantity: qty });
  }
  if (deposited.length) {
    try {
      await notifyGain(userId, {
        source: 'mission',
        grants: deposited.map(d => inventoryGrant(d.itemKey, d.quantity)),
        href: '/inventaire',
      });
    } catch {
      /* optionnel */
    }
  }
  return deposited;
}

async function pickCardIdByRarity(rarity, rng = Math.random) {
  const rows = await query(
    'SELECT id FROM card_definitions WHERE rarity = ? ORDER BY RAND() LIMIT 30',
    [rarity],
  );
  if (!rows.length) {
    const fallback = await query(
      "SELECT id FROM card_definitions WHERE rarity = 'common' ORDER BY RAND() LIMIT 20",
    );
    if (!fallback.length) return null;
    return fallback[Math.floor(rng() * fallback.length)].id;
  }
  return rows[Math.floor(rng() * rows.length)].id;
}

/** Révèle un parchemin scellé depuis le coffre. */
export async function revealSealedFromChest(userId, itemKey) {
  const def = getItem(itemKey);
  if (!def || def.kind !== 'pending_card') {
    throw httpError(400, 'Cet objet n’est pas un parchemin scellé.');
  }
  await consumeStack(userId, itemKey, 'chest', 1);
  const cardId = await pickCardIdByRarity(def.rarity || 'common');
  if (!cardId) throw httpError(500, 'Aucune carte disponible.');
  const added = await addCard(userId, cardId, { quantity: 1, source: 'mission' });
  return {
    inventory: await getInventory(userId),
    card: {
      collectionId: added.collectionId ?? null,
      isNew: Number(added.quantity) === 1,
      rarity: added.card?.rarity || def.rarity,
      card: added.card,
      source: 'sealed_scroll',
    },
  };
}

/** Ouvre un booster stocké dans le coffre. */
export async function openBoosterFromChest(userId, itemKey) {
  const def = getItem(itemKey);
  if (!def || def.kind !== 'booster') {
    throw httpError(400, 'Cet objet n’est pas un booster.');
  }
  await consumeStack(userId, itemKey, 'chest', 1);
  const { grantFreeBooster } = await import('./boosterService.js');
  const opened = await grantFreeBooster(userId, def.boosterType || 'standard');
  return {
    inventory: await getInventory(userId),
    boosterType: opened.boosterType || def.boosterType,
    cards: opened.cards || [],
    raritySummary: opened.raritySummary || null,
  };
}

/** Boutique objets — offre du jour + stock restant joueur. */
export async function getDailyItemOffers(userId) {
  if (!(await tableExists('shop_daily_offers'))) {
    throw httpError(503, 'Tables boutique objets absentes — lancez les migrations.');
  }
  const dayKey = utcDayKey();
  let rows = await query('SELECT offers_json FROM shop_daily_offers WHERE day_key = ? LIMIT 1', [
    dayKey,
  ]);
  if (!rows[0]) {
    const rolled = rollAccountDailyOffer(dayKey);
    await query('INSERT INTO shop_daily_offers (day_key, offers_json) VALUES (?, ?)', [
      dayKey,
      JSON.stringify(rolled.offers),
    ]);
    rows = [{ offers_json: rolled.offers }];
  }
  const offers = parseJson(rows[0].offers_json, []);
  const purchases = await query(
    'SELECT item_key, qty FROM shop_daily_purchases WHERE user_id = ? AND day_key = ?',
    [userId, dayKey],
  );
  const bought = Object.fromEntries(purchases.map(p => [p.item_key, Number(p.qty) || 0]));
  const withStock = offers.map(o => {
    const purchased = bought[o.id] || 0;
    const stockMax = Number(o.stockMax ?? o.stock) || 1;
    return {
      ...o,
      stockMax,
      stock: Math.max(0, stockMax - purchased),
    };
  });
  const now = new Date();
  const nextUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return {
    dayKey,
    renewsAt: nextUtc.toISOString(),
    offers: withStock,
  };
}

export async function buyDailyItem(userId, itemId) {
  const day = await getDailyItemOffers(userId);
  const offer = day.offers.find(o => o.id === itemId);
  if (!offer) throw httpError(404, 'Article hors offre du jour.');
  if (offer.stock <= 0) throw httpError(400, 'Stock épuisé pour aujourd’hui.');
  const def = getItem(itemId);
  if (!def) throw httpError(404, 'Objet inconnu.');
  const price = Number(offer.priceShop ?? offer.price ?? def.priceShop) || 0;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [profiles] = await connection.execute(
      'SELECT ryos FROM player_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (!profiles[0]) throw httpError(404, 'Profil introuvable.');
    if (Number(profiles[0].ryos) < price) {
      throw httpError(400, 'Ryos insuffisants.', 'INSUFFICIENT_RYOS');
    }
    await connection.execute('UPDATE player_profiles SET ryos = ryos - ? WHERE user_id = ?', [
      price,
      userId,
    ]);
    await connection.execute(
      `INSERT INTO shop_daily_purchases (user_id, day_key, item_key, qty)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE qty = qty + 1`,
      [userId, day.dayKey, itemId],
    );
    await upsertStack(userId, itemId, 'chest', 1, null, connection);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  try {
    await notifyGain(userId, {
      source: 'shop',
      grants: [inventoryGrant(itemId, 1)],
      href: '/inventaire',
    });
  } catch {
    /* optionnel */
  }

  const [{ ryos }] = await query('SELECT ryos FROM player_profiles WHERE user_id = ? LIMIT 1', [
    userId,
  ]);
  return {
    inventory: await getInventory(userId),
    offers: await getDailyItemOffers(userId),
    balances: { ryos: Number(ryos) || 0 },
  };
}

export const __test = {
  serializeItemRow,
  shopPriceFromRun: (n) => Math.round((Number(n) || 0) * 2 / 5) * 5,
};
