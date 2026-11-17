/**
 * Grant starter cards + starter deck for new (or empty) V2 characters.
 * Idempotent: no-op when collection / active deck already present.
 */
import { STARTER_CARD_SLUGS, STARTER_DECK_NAME_FR } from '../config/starterLoadout.js';
import { query } from '../config/database.js';
import { getCardBySlug } from './cardService.js';
import { addCard, getCollection, grantStarterCollection } from './collectionService.js';
import { createDeck, listDecks } from './deckService.js';

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

async function resolveStarterDefinitionIds() {
  const ids = [];
  for (const slug of STARTER_CARD_SLUGS) {
    const card = await getCardBySlug(slug);
    if (card?.id) ids.push(card.id);
  }
  return ids;
}

/**
 * Accorde les cartes de base si la collection est vide.
 * @returns {{ granted: boolean, count: number }}
 */
export async function ensureStarterCollection(userId) {
  if (!(await tableExists('user_card_collection')) || !(await tableExists('card_definitions'))) {
    return { granted: false, count: 0 };
  }

  const existing = await getCollection(userId);
  if (existing.length > 0) {
    return { granted: false, count: existing.length };
  }

  const definitionIds = await resolveStarterDefinitionIds();
  if (!definitionIds.length) {
    return { granted: false, count: 0 };
  }

  await grantStarterCollection(userId, definitionIds);
  return { granted: true, count: definitionIds.length };
}

/**
 * Crée un deck actif rempli avec toute la collection si aucun deck n'existe.
 * Si la collection a moins de 20 cartes, crée quand même un deck partiel
 * (le joueur pourra le compléter) — on préfère un deck visible à rien.
 */
export async function ensureStarterDeck(userId, { name = STARTER_DECK_NAME_FR } = {}) {
  if (!(await tableExists('user_decks'))) {
    return { created: false, deck: null };
  }

  const decks = await listDecks(userId);
  if (decks.length > 0) {
    return { created: false, deck: decks.find(d => d.isActive) || decks[0] };
  }

  const collection = await getCollection(userId);
  if (!collection.length) {
    return { created: false, deck: null };
  }

  const cards = collection.map(entry => ({
    collectionId: entry.collectionId,
    quantity: Math.min(3, Math.max(1, Number(entry.quantity) || 1)),
  }));

  const deck = await createDeck(userId, { name, cards });
  return { created: true, deck };
}

/**
 * Pipeline complet : collection vide → grant starters → deck starter.
 */
export async function ensureStarterLoadout(userId) {
  const resetRows = await query('SELECT starter_loadout_reset_at FROM users WHERE id = ? LIMIT 1', [
    userId,
  ]);
  if (resetRows[0]?.starter_loadout_reset_at) {
    return {
      collectionGranted: false,
      collectionCount: (await getCollection(userId)).length,
      deckCreated: false,
      deck: null,
    };
  }

  const collectionResult = await ensureStarterCollection(userId);
  const deckResult = await ensureStarterDeck(userId);
  return {
    collectionGranted: collectionResult.granted,
    collectionCount: collectionResult.count || (await getCollection(userId)).length,
    deckCreated: deckResult.created,
    deck: deckResult.deck,
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
      collectionCount: 0,
      deckCreated: false,
      deck: null,
      error: error.message,
    };
  }
}

export { addCard };
