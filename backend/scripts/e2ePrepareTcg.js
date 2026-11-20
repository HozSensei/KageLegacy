#!/usr/bin/env node
/** Prépare les fixtures TCG dans une base E2E dédiée, sans réécrire de decks existants. */
import pool, { query } from '../src/config/database.js';
import { findUserByUsername, registerUser, verifyPassword } from '../src/services/authService.js';
import { createCharacter, getCharacter } from '../src/services/playerCharacterService.js';
import {
  getStarterGrantQuantity,
  selectStarterDeckEntries,
  STARTER_CARD_SLUGS,
} from '../src/config/starterLoadout.js';
import { getCardBySlug } from '../src/services/cardService.js';
import { addCard, getCollection } from '../src/services/collectionService.js';
import { createDeck, listDecks, setActiveDeck, validateDeck } from '../src/services/deckService.js';
import { assertE2eDatabase } from './lib/e2eGuard.js';

async function ensurePlayableFixtureDeck(userId) {
  const decks = await listDecks(userId);
  if (decks.some(deck => deck.isActive && deck.validation.valid)) return;

  let playable = decks.find(deck => deck.validation.valid);
  if (!playable) {
    // Sur une base de test réutilisée, laisser les anciens decks intacts.
    const collection = new Map(
      (await getCollection(userId)).map(entry => [entry.card.slug, entry])
    );
    const definitions = await Promise.all(
      STARTER_CARD_SLUGS.map(slug => collection.get(slug)?.card ?? getCardBySlug(slug))
    );
    const preset = selectStarterDeckEntries(
      definitions.map(card => ({ card, quantity: getStarterGrantQuantity(card.slug) }))
    );
    const validation = validateDeck(preset);
    if (!validation.valid)
      throw new Error(`Starter E2E non jouable : ${validation.errors.join(' ')}`);

    const cards = [];
    for (const { card, quantity } of preset) {
      let entry = collection.get(card.slug);
      const missing = quantity - (entry?.quantity ?? 0);
      if (missing > 0) {
        entry = await addCard(userId, card.id, { quantity: missing, runHooks: false });
      }
      cards.push({ collectionId: entry.collectionId, quantity });
    }
    playable = await createDeck(userId, { name: 'Deck E2E', cards });
  }
  if (!playable.isActive) await setActiveDeck(userId, playable.id);
}

async function main() {
  await assertE2eDatabase();
  let user = await findUserByUsername('demo_sensei');
  if (user) {
    if (user.is_guest || !verifyPassword('demo', user.password_hash)) {
      throw new Error(
        'Le compte demo_sensei existant ne correspond pas à la fixture E2E ; il est conservé sans modification.'
      );
    }
  } else {
    ({ user } = await registerUser({
      username: 'demo_sensei',
      email: 'demo_sensei@kage.local',
      password: 'demo',
      characterName: 'Renjiro',
      language: 'fr',
    }));
  }

  const profile = await query('SELECT id FROM player_profiles WHERE user_id = ?', [user.id]);
  if (!profile.length)
    throw new Error(
      'Profil demo_sensei incomplet ; aucune donnée existante ne sera réinitialisée.'
    );

  let character = await getCharacter(user.id);
  if (!character) {
    character = await createCharacter(user.id, { name: 'Demo Genin', elementAffinity: 'Katon' });
  }
  await ensurePlayableFixtureDeck(user.id);

  console.log(
    `E2E_RESULT:${JSON.stringify({
      ok: true,
      userId: user.id,
      characterId: character.id,
      name: character.name,
      level: character.level,
    })}`
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
