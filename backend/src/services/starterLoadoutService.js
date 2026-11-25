/**
 * Grant starter cards + two starter decks (Taijutsu / Ninjutsu) for new characters.
 * Idempotent for normal login: existing decks are left alone unless empty.
 */
import {
  getStarterGrantQuantity,
  selectStarterDeckEntries,
  STARTER_CARD_SLUGS,
  STARTER_DECK_PRESETS,
  STARTER_INVENTORY_ITEMS,
} from '../config/starterLoadout.js';
import { query } from '../config/database.js';
import { getCardBySlug } from './cardService.js';
import { addCard, getCollection } from './collectionService.js';
import { createDeck, listDecks } from './deckService.js';
import { grantToChest } from './playerInventoryService.js';

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?
       LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Accorde les cartes de base manquantes (collection vide ou top-up des quantités).
 * @returns {{ granted: boolean, toppedUp: boolean, count: number }}
 */
export async function ensureStarterCollection(userId, { topUp = false } = {}) {
  if (!(await tableExists('user_card_collection')) || !(await tableExists('card_definitions'))) {
    return { granted: false, toppedUp: false, count: 0 };
  }

  const existing = await getCollection(userId);
  const bySlug = new Map(existing.map(entry => [entry.card.slug, entry]));

  if (existing.length === 0) {
    const cards = await Promise.all(STARTER_CARD_SLUGS.map(getCardBySlug));
    for (const { id, slug } of cards) {
      await addCard(userId, id, { quantity: getStarterGrantQuantity(slug), source: 'starter' });
    }
    return { granted: true, toppedUp: false, count: cards.length };
  }

  if (!topUp) {
    return { granted: false, toppedUp: false, count: existing.length };
  }

  let topped = 0;
  for (const slug of STARTER_CARD_SLUGS) {
    const want = getStarterGrantQuantity(slug);
    const owned = bySlug.get(slug);
    const have = Number(owned?.quantity) || 0;
    if (have >= want) continue;
    const card = owned?.card || (await getCardBySlug(slug));
    await addCard(userId, card.id, { quantity: want - have, source: 'starter' });
    topped += 1;
  }
  return {
    granted: false,
    toppedUp: topped > 0,
    count: (await getCollection(userId)).length,
  };
}

/**
 * Crée les deux presets starter uniquement si aucun deck n’existe.
 * @returns {{ created: boolean, decks: object[] }}
 */
export async function ensureStarterDecks(userId) {
  if (!(await tableExists('user_decks'))) {
    return { created: false, decks: [] };
  }

  const existing = await listDecks(userId);
  if (existing.length > 0) {
    return { created: false, decks: existing };
  }

  const collection = await getCollection(userId);
  const createdDecks = [];
  for (const preset of STARTER_DECK_PRESETS) {
    const cards = selectStarterDeckEntries(collection, preset).map(({ collectionId, quantity }) => ({
      collectionId,
      quantity,
    }));
    if (!cards.length) continue;
    const deck = await createDeck(userId, {
      name: preset.nameFr,
      archetype: preset.archetype,
      cards,
      skipOnboarding: true,
    });
    createdDecks.push(deck);
  }
  return { created: createdDecks.length > 0, decks: createdDecks };
}

/** @deprecated Prefer ensureStarterDecks */
export async function ensureStarterDeck(userId, options = {}) {
  const result = await ensureStarterDecks(userId);
  return {
    created: result.created,
    deck: result.decks.find(d => d.isActive) || result.decks[0] || null,
    ...options,
  };
}

/**
 * Accorde les objets starter manquants (ex. bandage) dans le coffre.
 * Idempotent : ne regive pas si l’objet est déjà en coffre ou poche.
 */
export async function ensureStarterInventory(userId) {
  if (!(await tableExists('user_inventory_items'))) {
    return { granted: false, items: [] };
  }
  const granted = [];
  for (const entry of STARTER_INVENTORY_ITEMS) {
    const rows = await query(
      `SELECT COALESCE(SUM(quantity), 0) AS qty
       FROM user_inventory_items
       WHERE user_id = ? AND item_key = ?`,
      [userId, entry.itemKey],
    );
    const have = Number(rows[0]?.qty) || 0;
    if (have > 0) continue;
    try {
      await grantToChest(userId, entry.itemKey, {
        quantity: entry.quantity,
        source: 'starter',
        notify: false,
      });
      granted.push(entry.itemKey);
    } catch (err) {
      console.warn(`[starterLoadout] inventory grant ${entry.itemKey}:`, err.message);
    }
  }
  return { granted: granted.length > 0, items: granted };
}

/**
 * Pipeline complet : collection → deux decks starter → objets inventaire.
 */
export async function ensureStarterLoadout(userId, { topUpCollection = false } = {}) {
  const resetRows = await query('SELECT starter_loadout_reset_at FROM users WHERE id = ? LIMIT 1', [
    userId,
  ]);
  if (resetRows[0]?.starter_loadout_reset_at) {
    return {
      collectionGranted: false,
      collectionToppedUp: false,
      collectionCount: (await getCollection(userId)).length,
      deckCreated: false,
      decks: [],
      deck: null,
      inventoryGranted: false,
      inventoryItems: [],
    };
  }

  const collectionResult = await ensureStarterCollection(userId, { topUp: topUpCollection });
  const deckResult = await ensureStarterDecks(userId);
  const inventoryResult = await ensureStarterInventory(userId);
  const decks = deckResult.decks;
  return {
    collectionGranted: collectionResult.granted,
    collectionToppedUp: Boolean(collectionResult.toppedUp),
    collectionCount: collectionResult.count || (await getCollection(userId)).length,
    deckCreated: deckResult.created,
    decks,
    deck: decks.find(d => d.isActive) || decks[0] || null,
    inventoryGranted: inventoryResult.granted,
    inventoryItems: inventoryResult.items,
  };
}

/** Grant one-shot used right after character creation (best-effort). */
export async function grantStarterLoadoutOnCreate(userId) {
  try {
    return await ensureStarterLoadout(userId);
  } catch (error) {
    // Character creation must not fail if cards are not seeded yet.
    console.warn('[starterLoadout] grant on create skipped:', error.message);
    return {
      collectionGranted: false,
      collectionToppedUp: false,
      collectionCount: 0,
      deckCreated: false,
      decks: [],
      deck: null,
      inventoryGranted: false,
      inventoryItems: [],
      error: error.message,
    };
  }
}

export { addCard };
