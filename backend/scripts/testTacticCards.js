/**
 * Tests cartes tactiques — collection, charges, marché (pool deck).
 */
import { query } from '../src/config/database.js';
import {
  ensureStarterTacticCards,
  getTacticCardsForUser,
  grantTacticCard,
} from '../src/services/tacticCards/tacticCardService.js';
import { createTacticCardListing } from '../src/services/playerMarketService.js';
import {
  STARTER_CARD_SLUGS,
  TACTIC_CARD_MAX_CHARGES,
  SHOP_OFFERS_PER_RESTOCK,
  pickShopSlugs,
} from '../src/services/tacticCards/tacticCardCatalog.js';

const PREFIX = `tactic_cards_${Date.now()}`;

async function createUser() {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `${PREFIX}_user`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, 'Test', 'Taijutsu', 10000, 0, 100, 'fr')`,
    [userId]
  );
  return { userId };
}

async function cleanup(userId) {
  await query('DELETE FROM player_listings WHERE seller_user_id = ?', [userId]);
  await query('DELETE FROM user_tactic_cards WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

function testShopRotation() {
  const userA = pickShopSlugs(42, 3);
  const userARepeat = pickShopSlugs(42, 3);
  const userB = pickShopSlugs(99, 3);
  console.assert(userA.length === SHOP_OFFERS_PER_RESTOCK, `shop offers count ${userA.length}`);
  console.assert(new Set(userA).size === userA.length, 'shop offers unique');
  console.assert(JSON.stringify(userA) === JSON.stringify(userARepeat), 'shop deterministic');
  console.assert(JSON.stringify(userA) !== JSON.stringify(userB), 'shop per-player variance');
}

async function main() {
  testShopRotation();

  const defRows = await query('SELECT COUNT(*) AS c FROM tactic_card_definitions');
  if (!Number(defRows[0]?.c)) {
    console.error('SKIP: migration 039 non appliquée — exécutez les migrations.');
    process.exit(0);
  }

  const { userId } = await createUser();

  const granted = await ensureStarterTacticCards(userId);
  console.assert(granted, 'starter cards granted');
  const cards = await getTacticCardsForUser(userId);
  console.assert(
    cards.length === STARTER_CARD_SLUGS.length,
    `${STARTER_CARD_SLUGS.length} starter cards, got ${cards.length}`
  );
  console.assert(
    STARTER_CARD_SLUGS.every((slug) => cards.some((c) => c.slug === slug)),
    'starter slugs present'
  );
  console.assert(cards.every((c) => c.chargesRemaining === TACTIC_CARD_MAX_CHARGES), '3 charges each');

  const dup = await ensureStarterTacticCards(userId);
  console.assert(!dup, 'no duplicate starter grant');

  const cardId = cards[0].userTacticCardId;
  const listing = await createTacticCardListing(userId, cardId, 450);
  console.assert(listing.listingId, 'card listed');

  await grantTacticCard(userId, 'tai-parade-ecole');
  const afterGrant = await getTacticCardsForUser(userId);
  console.assert(afterGrant.length >= 4, 'grant adds card to pool');

  await cleanup(userId);
  console.log('testTacticCards: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
