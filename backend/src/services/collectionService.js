/**
 * User card collection — grant, upgrade, disenchant, craft
 */
import { query, getConnection } from '../config/database.js';
import {
  applyUpgradeBonuses,
  CRAFT_DUST,
  DISENCHANT_DUST,
  getCardDefinitionRow,
  serializeCardDefinition,
  UPGRADE_COSTS,
} from './cardService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function serializeCollectionEntry(row) {
  const card = serializeCardDefinition(row, { upgradeLevel: row.upgrade_level });
  return {
    collectionId: row.collection_id,
    userId: row.user_id,
    cardDefinitionId: row.card_definition_id,
    upgradeLevel: row.upgrade_level,
    quantity: row.quantity,
    obtainedAt: row.obtained_at,
    obtainedSource: row.obtained_source,
    timesPlayed: row.times_played,
    card,
  };
}

const COLLECTION_SELECT = `
  SELECT
    ucc.id AS collection_id,
    ucc.user_id,
    ucc.card_definition_id,
    ucc.upgrade_level,
    ucc.quantity,
    ucc.obtained_at,
    ucc.obtained_source,
    ucc.times_played,
    cd.*
  FROM user_card_collection ucc
  JOIN card_definitions cd ON cd.id = ucc.card_definition_id
`;

export async function getCollection(userId, filters = {}) {
  const where = ['ucc.user_id = ?'];
  const params = [userId];

  if (filters.type) {
    where.push('cd.type = ?');
    params.push(filters.type);
  }
  if (filters.rarity) {
    where.push('cd.rarity = ?');
    params.push(filters.rarity);
  }

  const rows = await query(
    `${COLLECTION_SELECT}
     WHERE ${where.join(' AND ')}
     ORDER BY cd.rarity DESC, cd.type, cd.name_fr`,
    params
  );
  return rows.map(serializeCollectionEntry);
}

export async function getCollectionEntry(userId, collectionId) {
  const rows = await query(
    `${COLLECTION_SELECT}
     WHERE ucc.user_id = ? AND ucc.id = ?
     LIMIT 1`,
    [userId, collectionId]
  );
  if (!rows[0]) throw httpError(404, 'Carte de collection introuvable.');
  return serializeCollectionEntry(rows[0]);
}

/**
 * Ajoute une carte (ou +quantity si déjà possédée).
 */
export async function addCard(userId, cardDefinitionId, { quantity = 1, source = 'grant' } = {}) {
  const qty = Math.max(1, Number(quantity) || 1);
  const def = await getCardDefinitionRow(cardDefinitionId);
  if (!def) throw httpError(404, 'Définition de carte introuvable.');

  const existing = await query(
    `SELECT id, quantity FROM user_card_collection
     WHERE user_id = ? AND card_definition_id = ? LIMIT 1`,
    [userId, cardDefinitionId]
  );

  if (existing[0]) {
    await query('UPDATE user_card_collection SET quantity = quantity + ? WHERE id = ?', [
      qty,
      existing[0].id,
    ]);
    return getCollectionEntry(userId, existing[0].id);
  }

  const result = await query(
    `INSERT INTO user_card_collection
      (user_id, card_definition_id, upgrade_level, quantity, obtained_source)
     VALUES (?, ?, 0, ?, ?)`,
    [userId, cardDefinitionId, qty, source]
  );

  return getCollectionEntry(userId, result.insertId);
}

async function getSenseiResources(userId, connection = null) {
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const rows = await run(
    `SELECT ryos, card_dust, card_essence FROM sensei WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (!rows[0]) throw httpError(404, 'Sensei introuvable.');
  return {
    ryos: Number(rows[0].ryos) || 0,
    dust: Number(rows[0].card_dust) || 0,
    essence: Number(rows[0].card_essence) || 0,
  };
}

/**
 * Améliore une carte : Base → + → ++
 */
export async function upgradeCard(userId, collectionId) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT ucc.*, cd.rarity, cd.upgradable, cd.upgrade_bonuses_json, cd.passive_bonus_json,
              cd.base_cost, cd.base_damage, cd.base_block, cd.base_heal
       FROM user_card_collection ucc
       JOIN card_definitions cd ON cd.id = ucc.card_definition_id
       WHERE ucc.id = ? AND ucc.user_id = ?
       LIMIT 1 FOR UPDATE`,
      [collectionId, userId]
    );
    const entry = rows[0];
    if (!entry) throw httpError(404, 'Carte de collection introuvable.');
    if (!entry.upgradable) throw httpError(400, 'Cette carte ne peut pas être améliorée.');
    if (entry.upgrade_level >= 2) throw httpError(400, 'Carte déjà au niveau maximum (++).');
    if (entry.rarity === 'mythic' && entry.upgrade_level >= 1) {
      throw httpError(400, 'Les cartes mythiques ne montent qu’au niveau +.');
    }

    const nextLevel = entry.upgrade_level + 1;
    const costs = UPGRADE_COSTS[entry.rarity];
    const cost = costs?.[nextLevel - 1];
    if (!cost) throw httpError(400, 'Amélioration indisponible pour cette rareté.');

    const resources = await getSenseiResources(userId, connection);
    if (resources.ryos < cost.ryos) throw httpError(400, 'Ryos insuffisants.');
    if (resources.dust < cost.dust) throw httpError(400, 'Poussière de carte insuffisante.');
    if (resources.essence < cost.essence) throw httpError(400, 'Essence insuffisante.');

    await connection.execute(
      `UPDATE sensei
       SET ryos = ryos - ?, card_dust = card_dust - ?, card_essence = card_essence - ?
       WHERE user_id = ?`,
      [cost.ryos, cost.dust, cost.essence, userId]
    );

    await connection.execute(
      `UPDATE user_card_collection SET upgrade_level = ? WHERE id = ?`,
      [nextLevel, collectionId]
    );

    await connection.commit();

    const updated = await getCollectionEntry(userId, collectionId);
    return {
      entry: updated,
      costPaid: cost,
      computed: applyUpgradeBonuses(entry, nextLevel),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Désenchante 1 exemplaire → dust (et essence si légendaire/mythique upgradée).
 */
export async function disenchantCard(userId, collectionId, { quantity = 1 } = {}) {
  const qty = Math.max(1, Number(quantity) || 1);
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT ucc.*, cd.rarity
       FROM user_card_collection ucc
       JOIN card_definitions cd ON cd.id = ucc.card_definition_id
       WHERE ucc.id = ? AND ucc.user_id = ?
       LIMIT 1 FOR UPDATE`,
      [collectionId, userId]
    );
    const entry = rows[0];
    if (!entry) throw httpError(404, 'Carte de collection introuvable.');
    if (entry.quantity < qty) throw httpError(400, 'Quantité insuffisante.');

    // Vérifier si la carte est dans un deck actif (bloquer si on retirait trop)
    const [deckUsage] = await connection.execute(
      `SELECT COALESCE(SUM(udc.quantity), 0) AS used
       FROM user_deck_cards udc
       JOIN user_decks d ON d.id = udc.deck_id
       WHERE udc.user_card_collection_id = ? AND d.user_id = ?`,
      [collectionId, userId]
    );
    const usedInDecks = Number(deckUsage[0]?.used) || 0;
    if (entry.quantity - qty < usedInDecks) {
      throw httpError(400, 'Impossible de désenchanter : exemplaires utilisés dans un deck.');
    }

    const dustGain = (DISENCHANT_DUST[entry.rarity] || 0) * qty;
    let essenceGain = 0;
    if (
      (entry.rarity === 'legendary' || entry.rarity === 'mythic') &&
      entry.upgrade_level > 0
    ) {
      essenceGain = entry.rarity === 'mythic' ? 5 * qty : 2 * qty;
    }

    if (entry.quantity === qty) {
      await connection.execute('DELETE FROM user_card_collection WHERE id = ?', [collectionId]);
    } else {
      await connection.execute('UPDATE user_card_collection SET quantity = quantity - ? WHERE id = ?', [
        qty,
        collectionId,
      ]);
    }

    await connection.execute(
      `UPDATE sensei SET card_dust = card_dust + ?, card_essence = card_essence + ? WHERE user_id = ?`,
      [dustGain, essenceGain, userId]
    );

    await connection.commit();

    const resources = await getSenseiResources(userId);
    return {
      dustGained: dustGain,
      essenceGained: essenceGain,
      resources,
      remaining: entry.quantity === qty ? null : await getCollectionEntry(userId, collectionId),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Craft une carte depuis le catalogue (coût dust).
 */
export async function craftCard(userId, cardDefinitionId) {
  const def = await getCardDefinitionRow(cardDefinitionId);
  if (!def) throw httpError(404, 'Définition de carte introuvable.');
  if (def.is_exclusive) throw httpError(400, 'Cette carte exclusive ne peut pas être craftée.');

  const dustCost = CRAFT_DUST[def.rarity];
  if (dustCost == null) throw httpError(400, 'Craft indisponible.');

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const resources = await getSenseiResources(userId, connection);
    if (resources.dust < dustCost) throw httpError(400, 'Poussière de carte insuffisante.');

    await connection.execute(`UPDATE sensei SET card_dust = card_dust - ? WHERE user_id = ?`, [
      dustCost,
      userId,
    ]);

    const [existing] = await connection.execute(
      `SELECT id, quantity FROM user_card_collection
       WHERE user_id = ? AND card_definition_id = ? LIMIT 1 FOR UPDATE`,
      [userId, cardDefinitionId]
    );

    let collectionId;
    if (existing[0]) {
      await connection.execute('UPDATE user_card_collection SET quantity = quantity + 1 WHERE id = ?', [
        existing[0].id,
      ]);
      collectionId = existing[0].id;
    } else {
      const [result] = await connection.execute(
        `INSERT INTO user_card_collection
          (user_id, card_definition_id, upgrade_level, quantity, obtained_source)
         VALUES (?, ?, 0, 1, 'craft')`,
        [userId, cardDefinitionId]
      );
      collectionId = result.insertId;
    }

    await connection.commit();
    return {
      entry: await getCollectionEntry(userId, collectionId),
      dustSpent: dustCost,
      resources: await getSenseiResources(userId),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function grantStarterCollection(userId, cardDefinitionIds) {
  const granted = [];
  for (const cardId of cardDefinitionIds) {
    granted.push(await addCard(userId, cardId, { quantity: 1, source: 'starter' }));
  }
  return granted;
}
