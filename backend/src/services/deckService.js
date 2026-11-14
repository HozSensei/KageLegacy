/**
 * Deck management — create, activate, validate (20–30), passive bonuses
 *
 * Phase 1 branch point:
 *   playerCharacterService.getComputedStats → getDeckPassiveBonuses(userId)
 * Prefer importing this module’s getDeckPassiveBonuses (applique aussi les upgrades).
 */
import { query, getConnection } from '../config/database.js';
import { applyUpgradeBonuses, parseJsonSafe, serializeCardDefinition } from './cardService.js';

export const DECK_MIN_SIZE = 20;
export const DECK_MAX_SIZE = 30;
export const MAX_COPIES_PER_CARD = 3;

const STAT_KEYS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'vitesse',
  'intelligence',
  'dexterity',
  'maxHp',
];

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function emptyStats() {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
}

function mergeStats(...sources) {
  const result = emptyStats();
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [key, value] of Object.entries(source)) {
      if (!STAT_KEYS.includes(key)) continue;
      const n = Number(value);
      if (Number.isFinite(n)) result[key] += n;
    }
  }
  return result;
}

function serializeDeckCard(row) {
  const card = serializeCardDefinition(row, { upgradeLevel: row.upgrade_level });
  return {
    deckCardId: row.deck_card_id,
    collectionId: row.user_card_collection_id,
    cardDefinitionId: row.card_definition_id,
    quantity: row.quantity,
    position: row.position,
    upgradeLevel: row.upgrade_level,
    card,
  };
}

async function assertDeckOwner(deckId, userId) {
  const rows = await query(
    `SELECT * FROM user_decks WHERE id = ? AND user_id = ? LIMIT 1`,
    [deckId, userId]
  );
  if (!rows[0]) throw httpError(404, 'Deck introuvable.');
  return rows[0];
}

export async function getDeckCards(deckId) {
  const rows = await query(
    `SELECT
       udc.id AS deck_card_id,
       udc.deck_id,
       udc.user_card_collection_id,
       udc.card_definition_id,
       udc.quantity,
       udc.position,
       ucc.upgrade_level,
       cd.*
     FROM user_deck_cards udc
     JOIN user_card_collection ucc ON ucc.id = udc.user_card_collection_id
     JOIN card_definitions cd ON cd.id = udc.card_definition_id
     WHERE udc.deck_id = ?
     ORDER BY udc.position IS NULL, udc.position, cd.name_fr`,
    [deckId]
  );
  return rows.map(serializeDeckCard);
}

export function countDeckSize(cards) {
  return cards.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
}

/**
 * Valide la taille (20–30) et le max de copies.
 * @returns {{ valid: boolean, errors: string[], size: number }}
 */
export function validateDeck(cards) {
  const errors = [];
  const size = countDeckSize(cards);

  if (size < DECK_MIN_SIZE) {
    errors.push(`Deck trop petit (${size}/${DECK_MIN_SIZE} minimum).`);
  }
  if (size > DECK_MAX_SIZE) {
    errors.push(`Deck trop grand (${size}/${DECK_MAX_SIZE} maximum).`);
  }

  for (const card of cards) {
    const qty = Number(card.quantity) || 0;
    if (qty > MAX_COPIES_PER_CARD) {
      const name = card.card?.nameFr || card.cardDefinitionId || card.collectionId;
      errors.push(`Trop de copies de « ${name} » (max ${MAX_COPIES_PER_CARD}).`);
    }
  }

  return { valid: errors.length === 0, errors, size };
}

export async function listDecks(userId) {
  const decks = await query(
    `SELECT * FROM user_decks WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC`,
    [userId]
  );

  const result = [];
  for (const deck of decks) {
    const cards = await getDeckCards(deck.id);
    result.push({
      id: deck.id,
      userId: deck.user_id,
      name: deck.name,
      isActive: Boolean(deck.is_active),
      archetype: deck.archetype,
      createdAt: deck.created_at,
      updatedAt: deck.updated_at,
      size: countDeckSize(cards),
      validation: validateDeck(cards),
      cards,
    });
  }
  return result;
}

export async function getDeck(userId, deckId) {
  const deck = await assertDeckOwner(deckId, userId);
  const cards = await getDeckCards(deck.id);
  return {
    id: deck.id,
    userId: deck.user_id,
    name: deck.name,
    isActive: Boolean(deck.is_active),
    archetype: deck.archetype,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
    size: countDeckSize(cards),
    validation: validateDeck(cards),
    cards,
    passiveBonuses: computePassiveBonusesFromCards(cards),
  };
}

export async function getActiveDeck(userId) {
  const rows = await query(
    `SELECT * FROM user_decks WHERE user_id = ? AND is_active = 1 LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return null;
  return getDeck(userId, rows[0].id);
}

export async function createDeck(userId, { name, archetype = 'midrange', cards = [] } = {}) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < 1) throw httpError(400, 'Nom du deck requis.');

  const existingCount = await query(
    `SELECT COUNT(*) AS c FROM user_decks WHERE user_id = ?`,
    [userId]
  );
  const isFirst = Number(existingCount[0]?.c) === 0;

  const result = await query(
    `INSERT INTO user_decks (user_id, name, is_active, archetype) VALUES (?, ?, ?, ?)`,
    [userId, trimmed, isFirst ? 1 : 0, archetype]
  );

  const deckId = result.insertId;
  if (Array.isArray(cards) && cards.length > 0) {
    await replaceDeckCards(userId, deckId, cards);
  }

  return getDeck(userId, deckId);
}

export async function updateDeck(userId, deckId, { name, archetype } = {}) {
  await assertDeckOwner(deckId, userId);
  const sets = [];
  const params = [];

  if (name != null) {
    const trimmed = String(name).trim();
    if (!trimmed) throw httpError(400, 'Nom du deck invalide.');
    sets.push('name = ?');
    params.push(trimmed);
  }
  if (archetype != null) {
    sets.push('archetype = ?');
    params.push(archetype);
  }
  if (!sets.length) return getDeck(userId, deckId);

  params.push(deckId, userId);
  await query(`UPDATE user_decks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  return getDeck(userId, deckId);
}

export async function deleteDeck(userId, deckId) {
  const deck = await assertDeckOwner(deckId, userId);
  await query(`DELETE FROM user_decks WHERE id = ? AND user_id = ?`, [deckId, userId]);

  if (deck.is_active) {
    const others = await query(
      `SELECT id FROM user_decks WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
    if (others[0]) {
      await query(`UPDATE user_decks SET is_active = 1 WHERE id = ?`, [others[0].id]);
    }
  }

  return { deleted: true, id: deckId };
}

export async function setActiveDeck(userId, deckId) {
  await assertDeckOwner(deckId, userId);
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`UPDATE user_decks SET is_active = 0 WHERE user_id = ?`, [userId]);
    await connection.execute(`UPDATE user_decks SET is_active = 1 WHERE id = ? AND user_id = ?`, [
      deckId,
      userId,
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getDeck(userId, deckId);
}

async function loadOwnedCollection(userId, collectionId) {
  const rows = await query(
    `SELECT ucc.*, cd.rarity
     FROM user_card_collection ucc
     JOIN card_definitions cd ON cd.id = ucc.card_definition_id
     WHERE ucc.id = ? AND ucc.user_id = ?
     LIMIT 1`,
    [collectionId, userId]
  );
  return rows[0] || null;
}

/**
 * Remplace entièrement les cartes d’un deck.
 * cards: [{ collectionId, quantity }]
 */
export async function replaceDeckCards(userId, deckId, cards) {
  await assertDeckOwner(deckId, userId);

  const normalized = [];
  for (const entry of cards) {
    const collectionId = Number(entry.collectionId ?? entry.user_card_collection_id);
    const quantity = Math.max(1, Number(entry.quantity) || 1);
    if (!collectionId) throw httpError(400, 'collectionId requis.');
    const owned = await loadOwnedCollection(userId, collectionId);
    if (!owned) throw httpError(400, `Carte collection #${collectionId} introuvable.`);
    if (owned.quantity < quantity) {
      throw httpError(400, `Pas assez d’exemplaires pour la carte #${collectionId}.`);
    }
    normalized.push({
      collectionId,
      cardDefinitionId: owned.card_definition_id,
      quantity,
    });
  }

  const preview = normalized.map((n) => ({
    ...n,
    card: { nameFr: `#${n.collectionId}` },
  }));
  const validation = validateDeck(preview);
  // Allow incomplete decks while building — only hard-block oversize / over-copies
  if (validation.size > DECK_MAX_SIZE) {
    throw httpError(400, validation.errors.join(' '));
  }
  for (const n of normalized) {
    if (n.quantity > MAX_COPIES_PER_CARD) {
      throw httpError(400, `Max ${MAX_COPIES_PER_CARD} copies par carte.`);
    }
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`DELETE FROM user_deck_cards WHERE deck_id = ?`, [deckId]);
    let position = 0;
    for (const n of normalized) {
      position += 1;
      await connection.execute(
        `INSERT INTO user_deck_cards
          (deck_id, user_card_collection_id, card_definition_id, quantity, position)
         VALUES (?, ?, ?, ?, ?)`,
        [deckId, n.collectionId, n.cardDefinitionId, n.quantity, position]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getDeck(userId, deckId);
}

export async function addCardToDeck(userId, deckId, collectionId, quantity = 1) {
  await assertDeckOwner(deckId, userId);
  const qty = Math.max(1, Number(quantity) || 1);
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) throw httpError(404, 'Carte de collection introuvable.');

  const existing = await query(
    `SELECT * FROM user_deck_cards WHERE deck_id = ? AND user_card_collection_id = ? LIMIT 1`,
    [deckId, collectionId]
  );

  const currentQty = existing[0] ? Number(existing[0].quantity) : 0;
  const nextQty = currentQty + qty;
  if (nextQty > MAX_COPIES_PER_CARD) {
    throw httpError(400, `Max ${MAX_COPIES_PER_CARD} copies par carte.`);
  }
  if (nextQty > owned.quantity) {
    throw httpError(400, 'Pas assez d’exemplaires dans la collection.');
  }

  const cards = await getDeckCards(deckId);
  const sizeWithout = countDeckSize(cards.filter((c) => c.collectionId !== collectionId));
  if (sizeWithout + nextQty > DECK_MAX_SIZE) {
    throw httpError(400, `Deck limité à ${DECK_MAX_SIZE} cartes.`);
  }

  if (existing[0]) {
    await query(`UPDATE user_deck_cards SET quantity = ? WHERE id = ?`, [nextQty, existing[0].id]);
  } else {
    await query(
      `INSERT INTO user_deck_cards
        (deck_id, user_card_collection_id, card_definition_id, quantity, position)
       VALUES (?, ?, ?, ?, ?)`,
      [deckId, collectionId, owned.card_definition_id, nextQty, cards.length + 1]
    );
  }

  return getDeck(userId, deckId);
}

export async function removeCardFromDeck(userId, deckId, collectionId, quantity = 1) {
  await assertDeckOwner(deckId, userId);
  const qty = Math.max(1, Number(quantity) || 1);
  const existing = await query(
    `SELECT * FROM user_deck_cards WHERE deck_id = ? AND user_card_collection_id = ? LIMIT 1`,
    [deckId, collectionId]
  );
  if (!existing[0]) throw httpError(404, 'Carte absente du deck.');

  const nextQty = Number(existing[0].quantity) - qty;
  if (nextQty <= 0) {
    await query(`DELETE FROM user_deck_cards WHERE id = ?`, [existing[0].id]);
  } else {
    await query(`UPDATE user_deck_cards SET quantity = ? WHERE id = ?`, [nextQty, existing[0].id]);
  }

  return getDeck(userId, deckId);
}

function computePassiveBonusesFromCards(cards) {
  const bonuses = [];
  for (const entry of cards) {
    const qty = Number(entry.quantity) || 1;
    const passive = entry.card?.passiveBonus || {};
    for (let i = 0; i < qty; i += 1) {
      bonuses.push(passive);
    }
  }
  return mergeStats(...bonuses);
}

/**
 * Somme des passive_bonus des cartes du deck actif, avec upgrades appliqués.
 * Point d’entrée pour Phase 1 getComputedStats.
 */
export async function getDeckPassiveBonuses(userId) {
  const rows = await query(
    `SELECT
       udc.quantity,
       ucc.upgrade_level,
       cd.passive_bonus_json,
       cd.upgrade_bonuses_json,
       cd.base_cost,
       cd.base_damage,
       cd.base_block,
       cd.base_heal
     FROM user_decks d
     JOIN user_deck_cards udc ON udc.deck_id = d.id
     JOIN user_card_collection ucc ON ucc.id = udc.user_card_collection_id
     JOIN card_definitions cd ON cd.id = udc.card_definition_id
     WHERE d.user_id = ? AND d.is_active = 1`,
    [userId]
  );

  if (!rows.length) return emptyStats();

  const bonuses = [];
  for (const row of rows) {
    const computed = applyUpgradeBonuses(
      {
        passive_bonus_json: row.passive_bonus_json,
        upgrade_bonuses_json: row.upgrade_bonuses_json,
        base_cost: row.base_cost,
        base_damage: row.base_damage,
        base_block: row.base_block,
        base_heal: row.base_heal,
      },
      row.upgrade_level
    );
    const qty = Number(row.quantity) || 1;
    for (let i = 0; i < qty; i += 1) {
      bonuses.push(computed.passiveBonus);
    }
  }

  return mergeStats(...bonuses);
}

export { emptyStats as createEmptyPassiveStats, parseJsonSafe };
